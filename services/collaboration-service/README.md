# Collaboration Service

CodeStudio Collaborative collaboration-service microservice.

## Development

```bash
npm install
npm run dev
```

## Testing

```bash
npm test
```

## Docker

```bash
docker build -t codestudio-collaboration-service .
docker run -p 3000:3000 codestudio-collaboration-service
```

## Environment Variables

- `PORT`: Service port (default: 3000)
- `REDIS_URL`: Redis connection URL
- `MONGODB_URL`: MongoDB connection URL
- `NODE_ENV`: Environment (development/production)
