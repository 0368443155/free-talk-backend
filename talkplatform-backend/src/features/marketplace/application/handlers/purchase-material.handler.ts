import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PurchaseMaterialCommand } from '../commands/purchase-material.command';
import { Material } from '../../entities/material.entity';
import { MaterialPurchase } from '../../entities/material-purchase.entity';
import { MaterialAggregate } from '../../domain/material.aggregate';
import { User } from '../../../../users/user.entity';
import { WalletService } from '../../../wallet/wallet.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
@CommandHandler(PurchaseMaterialCommand)
export class PurchaseMaterialHandler implements ICommandHandler<PurchaseMaterialCommand> {
  private readonly logger = new Logger(PurchaseMaterialHandler.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    @InjectRepository(MaterialPurchase)
    private readonly purchaseRepository: Repository<MaterialPurchase>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly walletService: WalletService,
  ) {}

  async execute(command: PurchaseMaterialCommand): Promise<MaterialPurchase> {
    this.logger.log(`Purchasing material ${command.materialId} for user ${command.userId}`);

    return await this.dataSource.transaction(async (manager) => {
      // 1. Load material
      const material = await manager.findOne(Material, {
        where: { id: command.materialId },
        relations: ['purchases'],
      });

      if (!material) {
        throw new NotFoundException('Material not found');
      }

      // 2. Create material aggregate
      const materialAggregate = new MaterialAggregate(material);

      // 3. Check if can purchase
      const canPurchase = materialAggregate.canPurchase(command.userId);
      if (!canPurchase.canPurchase) {
        throw new BadRequestException(canPurchase.reason || 'Cannot purchase material');
      }

      // 4. Check user balance
      const balance = await this.walletService.getUserBalance(command.userId);
      if (balance < materialAggregate.priceCredits) {
        throw new BadRequestException('Insufficient credits');
      }

      // 5. Deduct credits
      const transaction = await this.walletService.deductCredits(
        command.userId,
        materialAggregate.priceCredits,
        `Purchase material: ${materialAggregate.title}`,
        command.materialId,
        {
          material_id: command.materialId,
          material_title: materialAggregate.title,
          teacher_id: materialAggregate.teacherId,
        },
      );

      // 6. Create purchase record
      const purchase = manager.create(MaterialPurchase, {
        material_id: command.materialId,
        user_id: command.userId,
        price_paid: materialAggregate.priceCredits,
        transaction_id: transaction.id,
        download_count: 0,
      });

      const savedPurchase = await manager.save(MaterialPurchase, purchase);

      // 7. Record purchase in material aggregate
      materialAggregate.recordPurchase(savedPurchase);
      await manager.save(Material, materialAggregate.entity);

      this.logger.log(`✅ Material ${command.materialId} purchased by user ${command.userId}`);

      return savedPurchase;
    });
  }
}
