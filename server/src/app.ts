import { Elysia } from 'elysia'

import type { GameRoom } from './game/room'

const CLIENT_DIST_URL = new URL('../../client/dist/', import.meta.url)
const CLIENT_INDEX_URL = new URL('index.html', CLIENT_DIST_URL)

function resolveStaticFileUrl(pathname: string) {
  try {
    const decodedPath = decodeURIComponent(pathname)
    const relativePath = decodedPath.replace(/^\/+/, '') || 'index.html'
    const candidate = new URL(relativePath, CLIENT_DIST_URL)

    if (!candidate.href.startsWith(CLIENT_DIST_URL.href)) {
      return null
    }

    return candidate
  } catch {
    return null
  }
}

function hasFileExtension(pathname: string) {
  const lastSegment = pathname.split('/').pop() ?? ''
  return lastSegment.includes('.')
}

function createFileResponse(file: Blob, cacheControl: string) {
  return new Response(file, {
    headers: {
      'Cache-Control': cacheControl,
    },
  })
}

export function createApp(room: GameRoom) {
  return new Elysia()
    .get('/health', () => room.getHealth())
    .ws('/ws', {
      open(ws) {
        room.handleOpen(ws)
      },
      message(ws, rawMessage) {
        room.handleMessage(ws, rawMessage)
      },
      close(ws) {
        room.handleClose(ws)
      },
    })
    .get('/', async () => {
      const indexFile = Bun.file(CLIENT_INDEX_URL)

      if (!(await indexFile.exists())) {
        return new Response('客户端资源缺失，请在项目根目录运行 `pnpm run build`', {
          status: 503,
        })
      }

      return createFileResponse(indexFile, 'no-cache')
    })
    .get('/*', async ({ request, set }) => {
      const indexFile = Bun.file(CLIENT_INDEX_URL)

      if (!(await indexFile.exists())) {
        set.status = 404
        return '未找到页面'
      }

      const pathname = new URL(request.url).pathname
      const staticFileUrl = resolveStaticFileUrl(pathname)

      if (staticFileUrl) {
        const staticFile = Bun.file(staticFileUrl)

        if (await staticFile.exists()) {
          const cacheControl =
            pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600'

          return createFileResponse(staticFile, cacheControl)
        }
      }

      if (!hasFileExtension(pathname)) {
        return createFileResponse(indexFile, 'no-cache')
      }

      set.status = 404
      return '未找到页面'
    })
}
