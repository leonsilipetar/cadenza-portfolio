describe('Authentication', () => {
  beforeAll(async () => {
    // Setup test database connection
  });

  afterAll(async () => {
    // Close test database connection
  });

  beforeEach(async () => {
    // Clear test database
  });

  it('should login user with valid credentials', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({
        email: 'test@test.com',
        password: 'validPassword123'
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
  });

  it('should fail with invalid credentials', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({
        email: 'test@test.com',
        password: 'wrongpassword'
      });
    expect(res.status).toBe(400);
  });
}); 