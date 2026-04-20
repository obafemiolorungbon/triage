import axios from 'axios';

describe('backend HTTP (api/v1)', () => {
  const base = () => axios.defaults.baseURL ?? '';

  it('GET /api/v1/health/ready returns ready payload', async () => {
    const res = await axios.get(`${base()}/api/v1/health/ready`);
    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({
      status: 'ready',
      database: true,
      redis: true,
    });
  });

  it('POST /api/v1/tickets creates ticket', async () => {
    const res = await axios.post(`${base()}/api/v1/tickets`, {
      customer_email: 'e2e@example.com',
      description: '1234567890 e2e body',
    });
    expect(res.status).toBe(201);
    expect(res.data).toMatchObject({ status: 'new' });
    expect(typeof res.data.id).toBe('string');
  });

  it('POST /api/v1/tickets rejects invalid body', async () => {
    await expect(
      axios.post(`${base()}/api/v1/tickets`, {
        customer_email: 'bad',
        description: 'short',
      }),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });

  it('GET /api/v1/tickets without session returns 401', async () => {
    await expect(axios.get(`${base()}/api/v1/tickets`)).rejects.toMatchObject({
      response: { status: 401 },
    });
  });
});
