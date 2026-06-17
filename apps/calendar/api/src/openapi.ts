export const openApiDoc = {
  openapi: '3.0.0',
  info: {
    title: 'Calendar API',
    version: '1.0.0',
    description: 'API for managing calendar events',
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Local development server',
    },
  ],
  paths: {
    '/api/health': {
      get: {
        summary: 'Health check',
        description: 'Check if the API and database are healthy',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean' },
                    app: { type: 'string' },
                    db: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                    dbLatency: { type: 'string' },
                  },
                },
              },
            },
          },
          '503': {
            description: 'API or database is unhealthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean' },
                    app: { type: 'string' },
                    db: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/events': {
      get: {
        summary: 'List calendar events',
        description: 'Get all calendar events or events in a date range',
        tags: ['Events'],
        parameters: [
          {
            name: 'startAt',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'date-time' },
            description: 'Start of date range (ISO 8601)',
          },
          {
            name: 'endAt',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'date-time' },
            description: 'End of date range (ISO 8601)',
          },
        ],
        responses: {
          '200': {
            description: 'List of events',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    events: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          title: { type: 'string' },
                          startAt: { type: 'string', format: 'date-time' },
                          endAt: { type: 'string', format: 'date-time' },
                          description: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid date range',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create calendar event',
        description: 'Create a new calendar event',
        tags: ['Events'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'startAt', 'endAt'],
                properties: {
                  title: { type: 'string' },
                  startAt: { type: 'string', format: 'date-time' },
                  endAt: { type: 'string', format: 'date-time' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Event created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    event: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        startAt: { type: 'string', format: 'date-time' },
                        endAt: { type: 'string', format: 'date-time' },
                        description: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid request',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '409': {
            description: 'Event conflict',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/events/{id}': {
      put: {
        summary: 'Update calendar event',
        description: 'Update an existing calendar event',
        tags: ['Events'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Event ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  startAt: { type: 'string', format: 'date-time' },
                  endAt: { type: 'string', format: 'date-time' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Event updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    event: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        startAt: { type: 'string', format: 'date-time' },
                        endAt: { type: 'string', format: 'date-time' },
                        description: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid request',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '404': {
            description: 'Event not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'object' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  },
};
