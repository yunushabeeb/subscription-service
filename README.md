subscription-service/
├── prisma/
│ └── schema.prisma
├── src/
│ ├── app.module.ts
│ ├── main.ts
│ ├── common/
│ │ ├── guards/
│ │ │ └── jwt-auth.guard.ts
│ │ ├── decorators/
│ │ │ └── current-user.decorator.ts
│ │ └── filters/
│ │ └── http-exception.filter.ts
│ ├── auth/
│ │ ├── auth.module.ts
│ │ ├── auth.controller.ts
│ │ ├── auth.service.ts
│ │ ├── strategies/
│ │ │ └── jwt.strategy.ts
│ │ └── dto/
│ │ └── login.dto.ts
│ ├── users/
│ │ ├── users.module.ts
│ │ ├── users.controller.ts
│ │ ├── users.service.ts
│ │ ├── users.repository.ts
│ │ └── dto/
│ │ └── create-user.dto.ts
│ ├── subscriptions/
│ │ ├── subscriptions.module.ts
│ │ ├── subscriptions.controller.ts
│ │ ├── subscriptions.service.ts
│ │ ├── subscriptions.repository.ts
│ │ └── dto/
│ │ └── checkout.dto.ts
│ ├── webhooks/
│ │ ├── webhooks.module.ts
│ │ ├── webhooks.controller.ts
│ │ └── webhooks.service.ts
│ └── admin/
│ ├── admin.module.ts
│ ├── admin.controller.ts
│ └── admin.service.ts
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── README.md

Local DB Docker
docker run --name subscription-db \
 -e POSTGRES_PASSWORD=password \
 -e POSTGRES_DB=subscription_db \
 -p 5433:5432 \
 -d postgres
