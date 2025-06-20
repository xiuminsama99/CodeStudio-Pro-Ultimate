#!/usr/bin/env python3
"""
创建微服务目录结构脚本
"""

import os
import json
from pathlib import Path

def create_microservice_structure():
    """创建完整的微服务目录结构"""
    
    # 微服务列表
    services = [
        "instance-service",
        "path-service", 
        "resource-service",
        "collaboration-service",
        "config-service"
    ]
    
    # 基础目录结构
    base_structure = {
        "src": ["controllers", "services", "models", "utils", "middleware"],
        "tests": ["unit", "integration"],
        "config": [],
        "docs": []
    }
    
    project_root = Path(".")
    
    for service in services:
        service_path = project_root / "services" / service
        
        print(f"创建 {service} 目录结构...")
        
        # 创建基础目录结构
        for main_dir, sub_dirs in base_structure.items():
            main_path = service_path / main_dir
            main_path.mkdir(parents=True, exist_ok=True)
            
            for sub_dir in sub_dirs:
                (main_path / sub_dir).mkdir(exist_ok=True)
        
        # 创建基础文件
        create_service_files(service_path, service)
        
        print(f"✅ {service} 目录结构创建完成")
    
    # 创建前端目录结构
    create_frontend_structure()
    
    # 创建基础设施目录
    create_infrastructure_structure()
    
    print("🚀 微服务目录结构创建完成！")

def create_service_files(service_path: Path, service_name: str):
    """创建微服务基础文件"""
    
    # package.json
    package_json = {
        "name": f"codestudio-{service_name}",
        "version": "1.0.0",
        "description": f"CodeStudio Collaborative {service_name}",
        "main": "src/index.js",
        "scripts": {
            "start": "node src/index.js",
            "dev": "nodemon src/index.js",
            "test": "jest",
            "build": "npm run test"
        },
        "dependencies": {
            "express": "^4.18.0",
            "cors": "^2.8.5",
            "helmet": "^6.0.0",
            "dotenv": "^16.0.0",
            "redis": "^4.6.0",
            "mongodb": "^6.0.0"
        },
        "devDependencies": {
            "nodemon": "^2.0.0",
            "jest": "^29.0.0",
            "supertest": "^6.3.0"
        }
    }
    
    with open(service_path / "package.json", 'w') as f:
        json.dump(package_json, f, indent=2)
    
    # Dockerfile
    dockerfile_content = f'''FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

EXPOSE 3000

USER node

CMD ["npm", "start"]
'''
    
    with open(service_path / "Dockerfile", 'w') as f:
        f.write(dockerfile_content)
    
    # README.md
    readme_content = f'''# {service_name.replace('-', ' ').title()}

CodeStudio Collaborative {service_name} microservice.

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
docker build -t codestudio-{service_name} .
docker run -p 3000:3000 codestudio-{service_name}
```

## Environment Variables

- `PORT`: Service port (default: 3000)
- `REDIS_URL`: Redis connection URL
- `MONGODB_URL`: MongoDB connection URL
- `NODE_ENV`: Environment (development/production)
'''
    
    with open(service_path / "README.md", 'w') as f:
        f.write(readme_content)
    
    # .env.example
    env_example = f'''# {service_name.upper()} Environment Variables
PORT=3000
NODE_ENV=development
REDIS_URL=redis://localhost:6379
MONGODB_URL=mongodb://localhost:27017/codestudio
LOG_LEVEL=info
'''
    
    with open(service_path / ".env.example", 'w') as f:
        f.write(env_example)

def create_frontend_structure():
    """创建前端目录结构"""
    frontend_path = Path("frontend")
    
    # 前端目录结构
    frontend_dirs = [
        "src/components",
        "src/services", 
        "src/utils",
        "src/assets",
        "src/styles",
        "public",
        "tests/unit",
        "tests/e2e"
    ]
    
    for dir_path in frontend_dirs:
        (frontend_path / dir_path).mkdir(parents=True, exist_ok=True)
    
    # 创建前端package.json
    frontend_package = {
        "name": "codestudio-collaborative-frontend",
        "version": "1.0.0",
        "description": "CodeStudio Collaborative Frontend",
        "scripts": {
            "dev": "vite",
            "build": "vite build",
            "preview": "vite preview",
            "test": "vitest",
            "test:e2e": "playwright test"
        },
        "dependencies": {
            "react": "^18.2.0",
            "react-dom": "^18.2.0",
            "react-router-dom": "^6.8.0",
            "axios": "^1.3.0",
            "antd": "^5.2.0"
        },
        "devDependencies": {
            "@vitejs/plugin-react": "^3.1.0",
            "vite": "^4.1.0",
            "vitest": "^0.28.0",
            "@playwright/test": "^1.30.0"
        }
    }
    
    with open(frontend_path / "package.json", 'w') as f:
        json.dump(frontend_package, f, indent=2)
    
    print("✅ 前端目录结构创建完成")

def create_infrastructure_structure():
    """创建基础设施目录结构"""
    infra_path = Path("infrastructure")
    
    # 基础设施目录
    infra_dirs = [
        "kubernetes/services",
        "kubernetes/deployments", 
        "kubernetes/configmaps",
        "docker",
        "monitoring/prometheus",
        "monitoring/grafana",
        "scripts/build",
        "scripts/deploy"
    ]
    
    for dir_path in infra_dirs:
        (infra_path / dir_path).mkdir(parents=True, exist_ok=True)
    
    print("✅ 基础设施目录结构创建完成")

if __name__ == "__main__":
    create_microservice_structure()
