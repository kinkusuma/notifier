import { TemplateEngineService } from './template-engine.service';

describe('TemplateEngineService', () => {
  let service: TemplateEngineService;

  beforeEach(() => {
    service = new TemplateEngineService();
  });

  it('should compile and render simple variables', () => {
    const template = 'Hello, {{name}}! Welcome to {{appName}}.';
    const data = { name: 'John', appName: 'Acme' };
    const result = service.render(template, data);
    expect(result).toBe('Hello, John! Welcome to Acme.');
  });

  it('should compile and render nested objects', () => {
    const template = 'User ID: {{user.id}}, Role: {{user.profile.role}}';
    const data = { user: { id: '123', profile: { role: 'admin' } } };
    const result = service.render(template, data);
    expect(result).toBe('User ID: 123, Role: admin');
  });

  it('should support custom helper upperCase', () => {
    const template = 'Welcome {{upperCase name}}';
    const data = { name: 'alice' };
    const result = service.render(template, data);
    expect(result).toBe('Welcome ALICE');
  });

  it('should support custom helper defaultVal', () => {
    const template = 'Hello, {{defaultVal nickname "Friend"}}!';
    const data = { nickname: null };
    const result = service.render(template, data);
    expect(result).toBe('Hello, Friend!');
  });

  it('should cache compiled templates for high performance', () => {
    const template = 'Quick test {{counter}}';
    const res1 = service.render(template, { counter: 1 });
    const res2 = service.render(template, { counter: 2 });
    expect(res1).toBe('Quick test 1');
    expect(res2).toBe('Quick test 2');
  });
});
