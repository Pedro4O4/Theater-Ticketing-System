"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_1 = require("express");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, cookie_parser_1.default)());
    app.use((0, express_1.json)({ limit: '100mb' }));
    app.use((0, express_1.urlencoded)({ limit: '100mb', extended: true }));
    const isProd = process.env.NODE_ENV === 'production';
    const rawOrigins = process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN;
    const allowedOrigins = rawOrigins
        ? rawOrigins.split(',').map(o => o.trim())
        : ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:5173'];
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin) {
                callback(null, true);
                return;
            }
            if (origin.match(/^https:\/\/theater-ticketing-system-nq1d[\w-]*\.vercel\.app$/)) {
                callback(null, true);
                return;
            }
            if (isProd) {
                if (allowedOrigins.some(ao => origin.includes(ao) || ao === '*')) {
                    callback(null, true);
                }
                else {
                    console.log(`CORS blocked for origin: ${origin}`);
                    callback(null, false);
                }
            }
            else {
                callback(null, true);
            }
        },
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
        allowedHeaders: 'Content-Type, Authorization',
    });
    const port = process.env.PORT || 3001;
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 Backend running on port ${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map