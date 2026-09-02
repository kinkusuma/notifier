import { Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';

@Injectable()
export class TemplateEngineService {
  private readonly logger = new Logger(TemplateEngineService.name);
  private readonly handlebars: typeof Handlebars;
  private readonly templateCache = new Map<string, Handlebars.TemplateDelegate>();

  constructor() {
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  private registerHelpers() {
    this.handlebars.registerHelper('upperCase', (str: string) => {
      return typeof str === 'string' ? str.toUpperCase() : '';
    });

    this.handlebars.registerHelper('lowerCase', (str: string) => {
      return typeof str === 'string' ? str.toLowerCase() : '';
    });

    this.handlebars.registerHelper('defaultVal', (value: any, defaultValue: any) => {
      return value !== undefined && value !== null && value !== '' ? value : defaultValue;
    });

    this.handlebars.registerHelper('formatDate', (date: Date | string, format?: string) => {
      if (!date) return '';
      const d = new Date(date);
      return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
    });
  }

  render(templateStr: string, variables: Record<string, any> = {}): string {
    if (!templateStr) return '';
    try {
      let compiled = this.templateCache.get(templateStr);
      if (!compiled) {
        compiled = this.handlebars.compile(templateStr);
        this.templateCache.set(templateStr, compiled);
      }
      return compiled(variables);
    } catch (err: any) {
      this.logger.error(`Failed to compile or render template: ${err.message}`, err.stack);
      throw err;
    }
  }
}
