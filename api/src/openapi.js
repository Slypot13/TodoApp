// Spécification OpenAPI de l'API, affichée par Swagger UI sur /docs.
const taskSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer', example: 1 },
    title: { type: 'string', example: 'Acheter du pain' },
    done: { type: 'boolean', example: false },
  },
};

const errorSchema = {
  type: 'object',
  properties: { message: { type: 'string' } },
};

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'integer', minimum: 1 },
};

function error(description) {
  return {
    description,
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  };
}

function taskResponse(description) {
  return {
    description,
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Task' } } },
  };
}

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Todo API',
    version: '1.0.0',
    description: 'API REST de la Todo App (Express + PostgreSQL).',
  },
  components: {
    schemas: { Task: taskSchema, Error: errorSchema },
  },
  paths: {
    '/health': {
      get: {
        summary: "État de l'API et de la base",
        responses: {
          200: { description: "L'API et la base répondent" },
          503: { description: 'La base est injoignable' },
        },
      },
    },
    '/tasks': {
      get: {
        summary: 'Lister les tâches',
        responses: {
          200: {
            description: 'Liste des tâches',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Task' } },
              },
            },
          },
        },
      },
      post: {
        summary: 'Créer une tâche',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string', example: 'Acheter du pain' },
                  done: { type: 'boolean', default: false },
                },
              },
            },
          },
        },
        responses: {
          201: taskResponse('Tâche créée'),
          400: error('Titre manquant ou invalide'),
        },
      },
    },
    '/tasks/{id}': {
      put: {
        summary: 'Modifier une tâche (seuls les champs envoyés changent)',
        parameters: [idParam],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  done: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: taskResponse('Tâche modifiée'),
          400: error('Identifiant ou champ invalide'),
          404: error('Tâche non trouvée'),
        },
      },
      delete: {
        summary: 'Supprimer une tâche',
        parameters: [idParam],
        responses: {
          200: { description: 'Tâche supprimée' },
          400: error('Identifiant invalide'),
          404: error('Tâche non trouvée'),
        },
      },
    },
  },
};
