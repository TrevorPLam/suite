export const openApiDoc = {
  openapi: '3.0.0',
  info: {
    title: 'Drive API',
    version: '1.0.0',
    description: 'API for managing files and folders',
  },
  servers: [
    {
      url: 'http://localhost:3003',
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
    '/api/v1/files': {
      get: {
        summary: 'List files',
        description: 'Get all files',
        tags: ['Files'],
        responses: {
          '200': {
            description: 'List of files',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    files: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          size: { type: 'number' },
                          mimeType: { type: 'string' },
                          folderId: { type: 'string' },
                          createdAt: { type: 'string', format: 'date-time' },
                          updatedAt: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Upload file',
        description: 'Upload a new file',
        tags: ['Files'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file', 'name'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                  name: { type: 'string' },
                  folderId: { type: 'string' },
                  mimeType: { type: 'string' },
                },
              },
            },
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'size'],
                properties: {
                  name: { type: 'string' },
                  size: { type: 'number' },
                  bytes: { type: 'string' },
                  folderId: { type: 'string' },
                  mimeType: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'File uploaded',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    file: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        size: { type: 'number' },
                        mimeType: { type: 'string' },
                        folderId: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
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
          '413': {
            description: 'File size exceeds limit',
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
    '/api/v1/files/{id}': {
      put: {
        summary: 'Rename file',
        description: 'Rename an existing file',
        tags: ['Files'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'File ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'File renamed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    file: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        size: { type: 'number' },
                        mimeType: { type: 'string' },
                        folderId: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
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
            description: 'File not found',
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
      delete: {
        summary: 'Delete file',
        description: 'Delete a file',
        tags: ['Files'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'File ID',
          },
        ],
        responses: {
          '200': {
            description: 'File deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'File not found',
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
    '/api/v1/files/{id}/download': {
      get: {
        summary: 'Download file',
        description: 'Download a file',
        tags: ['Files'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'File ID',
          },
        ],
        responses: {
          '200': {
            description: 'File content',
            content: {
              'application/octet-stream': {
                schema: {
                  type: 'string',
                  format: 'binary',
                },
              },
            },
          },
          '404': {
            description: 'File not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '503': {
            description: 'Storage not available',
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
    '/api/v1/files/{id}/move': {
      post: {
        summary: 'Move file',
        description: 'Move a file to a different folder',
        tags: ['Files'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'File ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  folderId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'File moved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    file: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        size: { type: 'number' },
                        mimeType: { type: 'string' },
                        folderId: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
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
            description: 'File not found',
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
    '/api/v1/files/search': {
      get: {
        summary: 'Search files',
        description: 'Search files by query',
        tags: ['Files'],
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Search query',
          },
          {
            name: 'folderId',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Filter by folder ID',
          },
        ],
        responses: {
          '200': {
            description: 'Search results',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    files: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          size: { type: 'number' },
                          mimeType: { type: 'string' },
                          folderId: { type: 'string' },
                          createdAt: { type: 'string', format: 'date-time' },
                          updatedAt: { type: 'string', format: 'date-time' },
                        },
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
        },
      },
    },
    '/api/v1/folders': {
      get: {
        summary: 'List folders',
        description: 'Get all folders or folders in a parent folder',
        tags: ['Folders'],
        parameters: [
          {
            name: 'parentId',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Parent folder ID',
          },
        ],
        responses: {
          '200': {
            description: 'List of folders',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    folders: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          parentId: { type: 'string' },
                          createdAt: { type: 'string', format: 'date-time' },
                          updatedAt: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create folder',
        description: 'Create a new folder',
        tags: ['Folders'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  parentId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Folder created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    folder: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        parentId: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
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
        },
      },
    },
    '/api/v1/folders/{id}': {
      put: {
        summary: 'Rename folder',
        description: 'Rename an existing folder',
        tags: ['Folders'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Folder ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Folder renamed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    folder: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        parentId: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
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
            description: 'Folder not found',
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
      delete: {
        summary: 'Delete folder',
        description: 'Delete a folder',
        tags: ['Folders'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Folder ID',
          },
        ],
        responses: {
          '200': {
            description: 'Folder deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Folder not found or not empty',
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
