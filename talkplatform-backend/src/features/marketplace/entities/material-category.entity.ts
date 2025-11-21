import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from 'typeorm';

@Entity('material_categories')
export class MaterialCategory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100 })
    name: string;

    @Column({ type: 'varchar', length: 100, unique: true })
    slug: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'char', length: 36, nullable: true })
    parent_id: string;

    @ManyToOne(() => MaterialCategory, (category) => category.children, {
        nullable: true,
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'parent_id' })
    parent: MaterialCategory;

    @OneToMany(() => MaterialCategory, (category) => category.parent)
    children: MaterialCategory[];

    @Column({ type: 'varchar', length: 100, nullable: true })
    icon: string;

    @Column({ type: 'int', default: 0 })
    display_order: number;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @CreateDateColumn({ type: 'timestamp', precision: 6 })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp', precision: 6 })
    updated_at: Date;
}
