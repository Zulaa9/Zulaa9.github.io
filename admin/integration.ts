/**
 * Panel de administración local del portfolio.
 *
 * - Solo se activa con `astro dev` (o `npm run admin`). En `astro build` esta
 *   integración no registra nada: el sitio publicado no tiene panel, rutas de
 *   administración, backend ni credenciales.
 * - Se sirve en /__admin/ desde el propio servidor de desarrollo y escribe los
 *   archivos de src/content/modules/ y los medios del repositorio.
 */
import type { AstroIntegration } from 'astro';
import { createAdminMiddleware } from './server.ts';

export default function adminPanel(): AstroIntegration {
  return {
    name: 'zula-admin-panel',
    hooks: {
      'astro:config:setup': ({ command, updateConfig, logger }) => {
        if (command !== 'dev') return;
        updateConfig({
          vite: {
            plugins: [
              {
                name: 'zula-admin-panel',
                apply: 'serve',
                configureServer(server) {
                  server.middlewares.use(createAdminMiddleware(server));
                },
              },
            ],
          },
        });
        logger.info('Panel de administración disponible en /__admin/ (solo en desarrollo).');
      },
    },
  };
}
