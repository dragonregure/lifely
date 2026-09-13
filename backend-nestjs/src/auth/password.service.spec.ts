import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  it('hashes and verifies a password', async () => {
    const hash = await service.hash('Password1');

    await expect(service.verify('Password1', hash)).resolves.toBe(true);
    await expect(service.verify('password1', hash)).resolves.toBe(false);
  });
});
