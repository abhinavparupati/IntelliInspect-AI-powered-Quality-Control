# IntelliInspect - AI-Powered Quality Control Application

## Overview

IntelliInspect is a full-stack AI-powered application for real-time quality control prediction using machine learning. The system consists of three main components:

- **Frontend**: Angular 18+ application providing an intuitive user interface
- **Backend**: ASP.NET Core 8 API for orchestrating services and data management
- **ML Service**: Python FastAPI microservice for machine learning training and inference

## Features

### 4-Screen Workflow
1. **Dataset Upload**: Upload and validate Bosch Production Line Performance dataset
2. **Date Range Configuration**: Define training, testing, and simulation periods
3. **Model Training & Evaluation**: Train ML models and view performance metrics
4. **Real-Time Simulation**: Live prediction simulation with real-time updates

### Key Capabilities
- Support for large CSV dataset uploads with progress tracking
- Synthetic timestamp augmentation for time-based data segmentation
- ML model training using XGBoost/LightGBM/scikit-learn
- Real-time prediction streaming with live UI updates
- Comprehensive performance metrics and visualizations

## Technology Stack

- **Frontend**: Angular 18+, TypeScript, Chart.js, Angular Material
- **Backend**: ASP.NET Core 8, Entity Framework, SignalR
- **ML Service**: Python 3.13, FastAPI, XGBoost, pandas, scikit-learn
- **Containerization**: Docker, Docker Compose
- **Data Processing**: Pandas, NumPy for large dataset handling

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- At least 4GB RAM available for containers
- Bosch Production Line Performance dataset from Kaggle

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd intelliinspect
```

2. Start the application:
```bash
docker-compose up --build
```

3. Access the application:
- Frontend: http://localhost:4200
- Backend API: http://localhost:5000
- ML Service: http://localhost:8000/docs

### Dataset Setup
1. Download the Bosch Production Line Performance dataset from Kaggle
2. Use the upload feature in the application to process the dataset
3. The system will automatically add synthetic timestamps and prepare the data

## Development Setup

### Frontend Development
```bash
cd frontend-angular
npm install
ng serve
```

### Backend Development
```bash
cd backend-dotnet
dotnet restore
dotnet run
```

### ML Service Development
```bash
cd ml-service-python
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Architecture

The application follows a microservices architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Angular        │    │  ASP.NET Core   │    │  Python ML      │
│  Frontend       │◄──►│  Backend        │◄──►│  Service        │
│  (Port 4200)    │    │  (Port 5000)    │    │  (Port 8000)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## API Documentation

### Backend API Endpoints
- `POST /api/dataset/upload` - Upload and process dataset
- `POST /api/dataset/validate-ranges` - Validate date ranges
- `POST /api/model/train` - Train ML model
- `GET /api/simulation/start` - Start real-time simulation
- `GET /api/simulation/status` - Get simulation status

### ML Service API Endpoints
- `POST /train` - Train machine learning model
- `POST /predict` - Single prediction
- `POST /predict-batch` - Batch predictions
- `GET /model/status` - Model status and metrics

## Performance Considerations

### Large Dataset Handling
- Streaming file upload with progress tracking
- Chunked data processing to manage memory usage
- Efficient pandas operations for data manipulation
- Background processing for model training

### Real-Time Updates
- SignalR for real-time communication
- WebSocket connections for live data streaming
- Optimized UI updates to prevent performance degradation

## Testing

### Run Tests
```bash
# Frontend tests
cd frontend-angular && npm test

# Backend tests
cd backend-dotnet && dotnet test

# ML Service tests
cd ml-service-python && python -m pytest
```

## Deployment

### Production Deployment
1. Build production images:
```bash
docker-compose -f docker-compose.prod.yml build
```

2. Deploy with production configuration:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables
- `API_URL`: Backend API URL for frontend
- `ML_SERVICE_URL`: ML service URL for backend
- `MODEL_PATH`: Path for storing trained models
- `DATA_PATH`: Path for dataset storage

## Demo Video Creation Steps

1. **Setup**: Show the application startup with `docker-compose up`
2. **Upload**: Demonstrate dataset upload with progress indication
3. **Configuration**: Configure training/testing/simulation date ranges
4. **Training**: Show model training process and performance metrics
5. **Simulation**: Display real-time prediction simulation with live charts
6. **Conclusion**: Highlight key features and benefits

Total demo duration: ~3 minutes

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- Check the documentation in the `docs/` directory
- Review API documentation at `/docs` endpoints
- Submit issues via GitHub Issues

## Acknowledgments

- Bosch Production Line Performance dataset from Kaggle
- Angular, ASP.NET Core, and FastAPI communities
- Docker and containerization best practices
