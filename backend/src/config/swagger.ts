import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'My Express API with TypeScript',
      version: '1.0.0',
      description: 'A simple Express API documented with Swagger',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
    ],
  },
  // Path to the API docs (relative to project root)
  apis: ['./routes/*.ts', './index.ts'], 
};

export const swaggerSpec = swaggerJsdoc(options);