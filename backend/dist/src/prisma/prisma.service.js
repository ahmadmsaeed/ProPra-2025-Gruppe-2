"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let PrismaService = PrismaService_1 = class PrismaService extends client_1.PrismaClient {
    logger = new common_1.Logger(PrismaService_1.name);
    constructor() {
        super({
            log: [
                { emit: 'event', level: 'query' },
                { emit: 'event', level: 'error' },
                { emit: 'event', level: 'info' },
                { emit: 'event', level: 'warn' },
            ],
        });
        if (process.env.NODE_ENV !== 'production') {
            this.setupQueryLogging();
        }
    }
    async onModuleInit() {
        try {
            await this.$connect();
            this.logger.log('Connected to database successfully');
        }
        catch (error) {
            this.logger.error('Failed to connect to database:', error);
            throw error;
        }
    }
    async enableShutdownHooks(app) {
        process.on('beforeExit', async () => {
            this.logger.log('Process beforeExit event triggered - closing database connections');
            await app.close();
        });
        ['SIGINT', 'SIGTERM', 'SIGUSR2'].forEach((signal) => {
            process.once(signal, async () => {
                this.logger.log(`${signal} signal received - closing database connections`);
                await this.$disconnect();
                await app.close();
                process.exit(0);
            });
        });
    }
    setupQueryLogging() {
        this.$on('query', (event) => {
            if (event.query && event.duration !== undefined) {
                if (event.duration > 100) {
                    this.logger.debug(`SLOW QUERY (${event.duration}ms): ${event.query}`);
                }
            }
        });
        this.$on('error', (event) => {
            this.logger.error(`Database error: ${event.message}`, event.target);
        });
    }
    async executeWithRetry(operation, retries = 3, delay = 50) {
        let lastError;
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                const shouldRetry = this.isTransientError(error);
                if (!shouldRetry) {
                    throw error;
                }
                this.logger.warn(`Database operation failed (attempt ${attempt}/${retries}). Retrying in ${delay}ms...`, error);
                await new Promise((resolve) => setTimeout(resolve, delay));
                delay *= 2;
            }
        }
        this.logger.error(`Database operation failed after ${retries} attempts`, lastError);
        throw lastError;
    }
    isTransientError(error) {
        const transientErrors = [
            'connection',
            'deadlock',
            'lock',
            'timeout',
            'disconnect',
            'socket',
            'ECONNRESET',
        ];
        if (!error)
            return false;
        const errorString = error.toString().toLowerCase();
        return transientErrors.some(type => errorString.includes(type));
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map