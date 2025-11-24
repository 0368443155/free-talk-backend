import {
  Injectable,
  BadRequestException,
  Logger,
  InjectDataSource,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LedgerTransaction } from './entities/ledger-transaction.entity';
import { LedgerEntry, EntryType } from './entities/ledger-entry.entity';
import { User } from '../../users/user.entity';
// Using crypto.randomUUID() instead of uuid package

/**
 * Wallet Service với Double-Entry Ledger
 * 
 * Đảm bảo tính toàn vẹn tài chính bằng cách:
 * 1. Mọi giao dịch đều có ít nhất 2 entries (DEBIT và CREDIT)
 * 2. Tổng tất cả entries trong một transaction_group = 0
 * 3. Mọi thay đổi số dư đều được ghi lại trong ledger
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(LedgerTransaction)
    private readonly transactionRepository: Repository<LedgerTransaction>,
    @InjectRepository(LedgerEntry)
    private readonly entryRepository: Repository<LedgerEntry>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Tạo giao dịch với Double-Entry
   * 
   * @param entries Array of { account_id, entry_type, amount, description }
   * @param description Mô tả giao dịch
   * @param transactionType Loại giao dịch
   * @param referenceId ID tham chiếu (booking_id, purchase_id, etc.)
   * @param metadata Metadata bổ sung
   */
  async createTransaction(
    entries: Array<{
      account_id: string;
      entry_type: EntryType;
      amount: number;
      description?: string;
    }>,
    description: string,
    transactionType: string,
    referenceId?: string,
    metadata?: any,
  ): Promise<LedgerTransaction> {
    // Validate: Tổng DEBIT = Tổng CREDIT
    const totalDebit = entries
      .filter((e) => e.entry_type === EntryType.DEBIT)
      .reduce((sum, e) => sum + e.amount, 0);

    const totalCredit = entries
      .filter((e) => e.entry_type === EntryType.CREDIT)
      .reduce((sum, e) => sum + e.amount, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      // Cho phép sai số nhỏ do làm tròn
      throw new BadRequestException(
        `Double-entry validation failed: DEBIT (${totalDebit}) != CREDIT (${totalCredit})`,
      );
    }

    // Tạo transaction group ID
    const transactionGroupId = crypto.randomUUID();

    return await this.dataSource.transaction(async (manager) => {
      // 1. Tạo LedgerTransaction
      const transaction = manager.create(LedgerTransaction, {
        transaction_group_id: transactionGroupId,
        description,
        transaction_type: transactionType,
        reference_id: referenceId,
        metadata,
      });

      const savedTransaction = await manager.save(LedgerTransaction, transaction);

      // 2. Tạo các entries và cập nhật số dư
      const savedEntries: LedgerEntry[] = [];

      for (const entryData of entries) {
        // Lấy số dư hiện tại của account
        const currentBalance = await this.getAccountBalance(
          entryData.account_id,
          manager,
        );

        // Tính số dư sau entry này
        let balanceAfter: number;
        if (entryData.account_id.startsWith('user-')) {
          // User account: DEBIT giảm, CREDIT tăng
          balanceAfter =
            entryData.entry_type === EntryType.DEBIT
              ? currentBalance - entryData.amount
              : currentBalance + entryData.amount;
        } else {
          // Platform/Escrow accounts: DEBIT tăng, CREDIT giảm (ngược lại)
          balanceAfter =
            entryData.entry_type === EntryType.DEBIT
              ? currentBalance + entryData.amount
              : currentBalance - entryData.amount;
        }

        // Tạo entry
        const entry = manager.create(LedgerEntry, {
          transaction_id: savedTransaction.id,
          account_id: entryData.account_id,
          entry_type: entryData.entry_type,
          amount: entryData.amount,
          balance_after: balanceAfter,
          description: entryData.description || description,
        });

        const savedEntry = await manager.save(LedgerEntry, entry);
        savedEntries.push(savedEntry);

        // 3. Cập nhật số dư trong User table (nếu là user account)
        if (entryData.account_id.startsWith('user-')) {
          const userId = entryData.account_id.replace('user-', '');
          await manager.update(User, { id: userId }, { credit_balance: balanceAfter });
        }
      }

      this.logger.log(
        `✅ Created transaction ${transactionGroupId}: ${description} (${entries.length} entries)`,
      );

      savedTransaction.entries = savedEntries;
      return savedTransaction;
    });
  }

  /**
   * Lấy số dư hiện tại của một account
   */
  async getAccountBalance(
    accountId: string,
    manager?: any,
  ): Promise<number> {
    const repo = manager
      ? manager.getRepository(LedgerEntry)
      : this.entryRepository;

    // Nếu là user account, lấy từ User table (nhanh hơn)
    if (accountId.startsWith('user-')) {
      const userId = accountId.replace('user-', '');
      const userRepo = manager
        ? manager.getRepository(User)
        : this.userRepository;
      const user = await userRepo.findOne({ where: { id: userId } });
      return user?.credit_balance || 0;
    }

    // Với platform accounts, tính từ ledger
    const lastEntry = await repo
      .createQueryBuilder('entry')
      .where('entry.account_id = :accountId', { accountId })
      .orderBy('entry.created_at', 'DESC')
      .getOne();

    return lastEntry?.balance_after || 0;
  }

  /**
   * Lấy lịch sử giao dịch của một account
   */
  async getAccountHistory(
    accountId: string,
    limit: number = 50,
    offset: number = 0,
  ) {
    const entries = await this.entryRepository.find({
      where: { account_id: accountId },
      relations: ['transaction'],
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
    });

    const total = await this.entryRepository.count({
      where: { account_id: accountId },
    });

    return {
      entries,
      total,
      limit,
      offset,
    };
  }

  /**
   * Lấy số dư của user (từ User table, nhanh hơn)
   */
  async getUserBalance(userId: string): Promise<number> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    return user?.credit_balance || 0;
  }

  /**
   * Transfer credits giữa 2 accounts
   */
  async transfer(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    description: string,
    referenceId?: string,
  ): Promise<LedgerTransaction> {
    return await this.createTransaction(
      [
        {
          account_id: fromAccountId,
          entry_type: EntryType.DEBIT,
          amount,
          description: `Transfer to ${toAccountId}`,
        },
        {
          account_id: toAccountId,
          entry_type: EntryType.CREDIT,
          amount,
          description: `Transfer from ${fromAccountId}`,
        },
      ],
      description,
      'transfer',
      referenceId,
    );
  }

  /**
   * Deduct credits từ user (ví dụ: khi đặt lịch)
   */
  async deductCredits(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string,
    metadata?: any,
  ): Promise<LedgerTransaction> {
    const accountId = `user-${userId}`;

    // Kiểm tra số dư
    const balance = await this.getUserBalance(userId);
    if (balance < amount) {
      throw new BadRequestException('Insufficient credits');
    }

    return await this.createTransaction(
      [
        {
          account_id: accountId,
          entry_type: EntryType.DEBIT,
          amount,
          description,
        },
        {
          account_id: 'escrow',
          entry_type: EntryType.CREDIT,
          amount,
          description: `Held for: ${description}`,
        },
      ],
      description,
      'deduction',
      referenceId,
      metadata,
    );
  }

  /**
   * Add credits cho user (ví dụ: khi mua credits)
   */
  async addCredits(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string,
    metadata?: any,
  ): Promise<LedgerTransaction> {
    const accountId = `user-${userId}`;

    return await this.createTransaction(
      [
        {
          account_id: 'platform',
          entry_type: EntryType.DEBIT,
          amount,
          description: `Credits sold to ${userId}`,
        },
        {
          account_id: accountId,
          entry_type: EntryType.CREDIT,
          amount,
          description,
        },
      ],
      description,
      'purchase',
      referenceId,
      metadata,
    );
  }

  /**
   * Revenue sharing (ví dụ: 70/30 giữa teacher và platform)
   */
  async shareRevenue(
    teacherId: string,
    totalAmount: number,
    platformPercentage: number,
    description: string,
    referenceId?: string,
  ): Promise<LedgerTransaction> {
    const teacherAccountId = `user-${teacherId}`;
    const platformAmount = (totalAmount * platformPercentage) / 100;
    const teacherAmount = totalAmount - platformAmount;

    return await this.createTransaction(
      [
        {
          account_id: 'escrow',
          entry_type: EntryType.DEBIT,
          amount: totalAmount,
          description: `Revenue sharing for ${description}`,
        },
        {
          account_id: 'platform',
          entry_type: EntryType.CREDIT,
          amount: platformAmount,
          description: `Platform fee (${platformPercentage}%)`,
        },
        {
          account_id: teacherAccountId,
          entry_type: EntryType.CREDIT,
          amount: teacherAmount,
          description: `Teacher earnings (${100 - platformPercentage}%)`,
        },
      ],
      description,
      'revenue_sharing',
      referenceId,
      {
        platform_percentage: platformPercentage,
        teacher_percentage: 100 - platformPercentage,
      },
    );
  }
}

