import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const poolQueryMock = vi.fn();

vi.mock('../db/connection.js', () => ({
  default: { query: poolQueryMock },
}));

function createResponseMock() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;
}

type HttpMethod = 'get' | 'post' | 'put' | 'delete';

function getRouteHandler(router: any, path: string, method: HttpMethod) {
  const layer = router.stack.find((stackLayer: any) => (
    stackLayer.route?.path === path
    && stackLayer.route?.methods?.[method]
  ));
  return layer?.route?.stack?.[0]?.handle as undefined | ((req: Request, res: Response) => Promise<void>);
}

describe('Training Profiles API', () => {
  beforeEach(() => {
    vi.resetModules();
    poolQueryMock.mockReset();
  });

  it('GET /dogs/:dogId/all returns 200 with combined payload', async () => {
    const { default: dogsRouter } = await import('../routes/trainingProfiles/dogs.js');
    const handler = getRouteHandler(dogsRouter, '/all', 'get');
    expect(handler).toBeTypeOf('function');

    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ id: 10 }] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'コマンド達成状況', items: [] }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, symbol: '○', label: 'できた' }] })
      .mockResolvedValueOnce({ rows: [{ id: 11, category_id: 1, achievement_symbol: '○' }] })
      .mockResolvedValueOnce({ rows: [{ id: 21, category_id: 2, note: 'ログ' }] })
      .mockResolvedValueOnce({ rows: [{ id: 31, note: '気になること' }] });

    const req = {
      params: { dogId: '10' },
      storeId: 1,
    } as unknown as Request;
    const res = createResponseMock();

    await handler!(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      categories: [{ id: 1, name: 'コマンド達成状況', items: [] }],
      achievementLevels: [{ id: 1, symbol: '○', label: 'できた' }],
      gridEntries: [{ id: 11, category_id: 1, achievement_symbol: '○' }],
      logEntries: [{ id: 21, category_id: 2, note: 'ログ' }],
      concerns: [{ id: 31, note: '気になること' }],
    });
  });

  it('GET /dogs/:dogId/all returns 400 when dogId is invalid', async () => {
    const { default: dogsRouter } = await import('../routes/trainingProfiles/dogs.js');
    const handler = getRouteHandler(dogsRouter, '/all', 'get');
    expect(handler).toBeTypeOf('function');

    const req = {
      params: { dogId: 'abc' },
      storeId: 1,
    } as unknown as Request;
    const res = createResponseMock();

    await handler!(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: '犬IDが不正です' });
    expect(poolQueryMock).not.toHaveBeenCalled();
  });

  it('GET /dogs/:dogId/all returns 404 when dog is outside store', async () => {
    const { default: dogsRouter } = await import('../routes/trainingProfiles/dogs.js');
    const handler = getRouteHandler(dogsRouter, '/all', 'get');
    expect(handler).toBeTypeOf('function');

    poolQueryMock.mockResolvedValueOnce({ rows: [] });

    const req = {
      params: { dogId: '999' },
      storeId: 1,
    } as unknown as Request;
    const res = createResponseMock();

    await handler!(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: '犬が見つかりません' });
  });

  it('PUT /dogs/:dogId/grid upserts entry', async () => {
    const { default: dogsRouter } = await import('../routes/trainingProfiles/dogs.js');
    const handler = getRouteHandler(dogsRouter, '/grid', 'put');
    expect(handler).toBeTypeOf('function');

    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ id: 10 }] })
      .mockResolvedValueOnce({
        rows: [{ id: 101, category_id: 1, training_item_id: 2, achievement_symbol: '○' }],
      });

    const req = {
      params: { dogId: '10' },
      body: {
        category_id: 1,
        training_item_id: 2,
        entry_date: '2026-02-12',
        achievement_symbol: '○',
      },
      storeId: 1,
      userId: 9,
    } as unknown as Request;
    const res = createResponseMock();

    await handler!(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ id: 101, category_id: 1, training_item_id: 2, achievement_symbol: '○' });
  });

  it('DELETE /dogs/:dogId/grid/:entryId deletes entry', async () => {
    const { default: dogsRouter } = await import('../routes/trainingProfiles/dogs.js');
    const handler = getRouteHandler(dogsRouter, '/grid/:entryId', 'delete');
    expect(handler).toBeTypeOf('function');

    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ id: 10 }] })
      .mockResolvedValueOnce({ rows: [{ id: 101 }] })
      .mockResolvedValueOnce({ rows: [] });

    const req = {
      params: { dogId: '10', entryId: '101' },
      storeId: 1,
    } as unknown as Request;
    const res = createResponseMock();

    await handler!(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('POST /dogs/:dogId/logs creates entry', async () => {
    const { default: dogsRouter } = await import('../routes/trainingProfiles/dogs.js');
    const handler = getRouteHandler(dogsRouter, '/logs', 'post');
    expect(handler).toBeTypeOf('function');

    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ id: 10 }] })
      .mockResolvedValueOnce({ rows: [{ id: 201, category_id: 2, note: 'good log' }] });

    const req = {
      params: { dogId: '10' },
      body: {
        category_id: 2,
        entry_date: '2026-02-12',
        note: 'good log',
      },
      storeId: 1,
      userId: 9,
    } as unknown as Request;
    const res = createResponseMock();

    await handler!(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 201, category_id: 2, note: 'good log' });
  });

  it('PUT /dogs/:dogId/logs/:entryId updates entry', async () => {
    const { default: dogsRouter } = await import('../routes/trainingProfiles/dogs.js');
    const handler = getRouteHandler(dogsRouter, '/logs/:entryId', 'put');
    expect(handler).toBeTypeOf('function');

    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ id: 10 }] })
      .mockResolvedValueOnce({ rows: [{ id: 201 }] })
      .mockResolvedValueOnce({ rows: [{ id: 201, note: 'updated log' }] });

    const req = {
      params: { dogId: '10', entryId: '201' },
      body: { note: 'updated log' },
      storeId: 1,
    } as unknown as Request;
    const res = createResponseMock();

    await handler!(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ id: 201, note: 'updated log' });
  });

  it('DELETE /dogs/:dogId/logs/:entryId deletes entry', async () => {
    const { default: dogsRouter } = await import('../routes/trainingProfiles/dogs.js');
    const handler = getRouteHandler(dogsRouter, '/logs/:entryId', 'delete');
    expect(handler).toBeTypeOf('function');

    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ id: 10 }] })
      .mockResolvedValueOnce({ rows: [{ id: 201 }] })
      .mockResolvedValueOnce({ rows: [] });

    const req = {
      params: { dogId: '10', entryId: '201' },
      storeId: 1,
    } as unknown as Request;
    const res = createResponseMock();

    await handler!(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('POST /dogs/:dogId/concerns creates entry', async () => {
    const { default: dogsRouter } = await import('../routes/trainingProfiles/dogs.js');
    const handler = getRouteHandler(dogsRouter, '/concerns', 'post');
    expect(handler).toBeTypeOf('function');

    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ id: 10 }] })
      .mockResolvedValueOnce({ rows: [{ id: 301, note: 'concern' }] });

    const req = {
      params: { dogId: '10' },
      body: {
        entry_date: '2026-02-12',
        note: 'concern',
      },
      storeId: 1,
      userId: 9,
    } as unknown as Request;
    const res = createResponseMock();

    await handler!(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 301, note: 'concern' });
  });

  it('PUT /dogs/:dogId/concerns/:entryId updates entry', async () => {
    const { default: dogsRouter } = await import('../routes/trainingProfiles/dogs.js');
    const handler = getRouteHandler(dogsRouter, '/concerns/:entryId', 'put');
    expect(handler).toBeTypeOf('function');

    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ id: 10 }] })
      .mockResolvedValueOnce({ rows: [{ id: 301 }] })
      .mockResolvedValueOnce({ rows: [{ id: 301, note: 'updated concern' }] });

    const req = {
      params: { dogId: '10', entryId: '301' },
      body: { note: 'updated concern' },
      storeId: 1,
    } as unknown as Request;
    const res = createResponseMock();

    await handler!(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ id: 301, note: 'updated concern' });
  });

  it('DELETE /dogs/:dogId/concerns/:entryId deletes entry', async () => {
    const { default: dogsRouter } = await import('../routes/trainingProfiles/dogs.js');
    const handler = getRouteHandler(dogsRouter, '/concerns/:entryId', 'delete');
    expect(handler).toBeTypeOf('function');

    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ id: 10 }] })
      .mockResolvedValueOnce({ rows: [{ id: 301 }] })
      .mockResolvedValueOnce({ rows: [] });

    const req = {
      params: { dogId: '10', entryId: '301' },
      storeId: 1,
    } as unknown as Request;
    const res = createResponseMock();

    await handler!(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});
