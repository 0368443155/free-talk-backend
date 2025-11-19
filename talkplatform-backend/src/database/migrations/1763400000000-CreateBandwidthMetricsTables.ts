import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateBandwidthMetricsTables1763400000000 implements MigrationInterface {
    name = 'CreateBandwidthMetricsTables1763400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create bandwidth_metrics table
        await queryRunner.createTable(new Table({
            name: "bandwidth_metrics",
            columns: [
                {
                    name: "id",
                    type: "varchar",
                    length: "36",
                    isPrimary: true,
                    generationStrategy: "uuid"
                },
                {
                    name: "endpoint",
                    type: "varchar",
                    length: "255",
                },
                {
                    name: "method",
                    type: "varchar",
                    length: "10",
                },
                {
                    name: "statusCode",
                    type: "int",
                },
                {
                    name: "responseTimeMs",
                    type: "int",
                },
                {
                    name: "inboundBytes",
                    type: "bigint",
                },
                {
                    name: "outboundBytes",
                    type: "bigint",
                },
                {
                    name: "activeConnections",
                    type: "int",
                },
                {
                    name: "timestamp",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP",
                },
                {
                    name: "userId",
                    type: "int",
                    isNullable: true,
                }
            ],
        }), true);

        // Create metrics_hourly table
        await queryRunner.createTable(new Table({
            name: "metrics_hourly",
            columns: [
                {
                    name: "id",
                    type: "varchar",
                    length: "36",
                    isPrimary: true,
                    generationStrategy: "uuid"
                },
                {
                    name: "endpoint",
                    type: "varchar",
                    length: "255",
                },
                {
                    name: "avgResponseTime",
                    type: "double",
                },
                {
                    name: "totalInboundBytes",
                    type: "bigint",
                },
                {
                    name: "totalOutboundBytes",
                    type: "bigint",
                },
                {
                    name: "requestCount",
                    type: "int",
                },
                {
                    name: "maxActiveConnections",
                    type: "int",
                },
                {
                    name: "avgBandwidthUsage",
                    type: "double",
                },
                {
                    name: "timestamp",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP",
                }
            ],
        }), true);

        // Create indexes
        await queryRunner.createIndex("bandwidth_metrics", new TableIndex({
            name: "IDX_BANDWIDTH_METRICS_TIMESTAMP",
            columnNames: ["timestamp"]
        }));

        await queryRunner.createIndex("metrics_hourly", new TableIndex({
            name: "IDX_METRICS_HOURLY_TIMESTAMP",
            columnNames: ["timestamp"]
        }));

        await queryRunner.createIndex("metrics_hourly", new TableIndex({
            name: "IDX_METRICS_HOURLY_ENDPOINT",
            columnNames: ["endpoint"]
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("metrics_hourly");
        await queryRunner.dropTable("bandwidth_metrics");
    }
}