# event-stream-micro

## Overview
`event-stream-micro` is a microservice designed to handle event streaming, rate limiting, and data persistence using MongoDB and Redis. It provides REST API endpoints to submit events, retrieve recent events, and get metrics about the processed events.

## Features
- **Event Streaming**: Uses Node.js streams to handle incoming events.
- **Rate Limiting**: Limits the number of events a user can submit within a specified time frame.
- **Data Persistence**: Stores event data in MongoDB.
- **Retry Logic**: Implements exponential backoff for retrying failed event processing.
- **REST API**: Provides endpoints to submit events, retrieve recent events, and get metrics.

## Technologies Used
- **Node.js**: JavaScript runtime for building the server.
- **Express**: Web framework for Node.js.
- **MongoDB**: NoSQL database for storing event data.
- **Redis**: In-memory data structure store for rate limiting.
- **ioredis**: Redis client for Node.js.
- **uuid**: Library to generate unique identifiers.
- **Jest**: Testing framework for JavaScript.

## Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/your-username/event-stream-micro.git
   cd event-stream-micro
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Ensure MongoDB and Redis are running on your local machine.

## Configuration
- MongoDB connection string is set to `mongodb://localhost:27017/events`.
- Redis connection is set to default settings.

## Usage
1. Start the server:
   ```sh
   npm start
   ```

2. The server will be running on `http://localhost:3000`.

## API Endpoints
### Submit a New Event
- **URL**: `/process`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "user": "username",
    "data": {
      "key": "value"
    }
  }
  ```
- **Response**:
  ```json
  {
    "message": "Event submitted"
  }
  ```

### Get Recent Events
- **URL**: `/events`
- **Method**: `GET`
- **Response**:
  ```json
  [
    {
      "_id": "uuid",
      "user": "username",
      "data": {
        "key": "value"
      },
      "timestamp": "2025-03-24T12:34:56.789Z"
    },
    ...
  ]
  ```

### Get Metrics
- **URL**: `/metrics`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "processedEvents": 100,
    "uniqueUsers": 10,
    "mostRecentEvent": "2025-03-24T12:34:56.789Z"
  }
  ```

## Testing
Run the tests using Jest:
```sh
npm test
```
