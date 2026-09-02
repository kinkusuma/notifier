import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTemplateDto) {
    const existing = await this.prisma.template.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Template with slug "${dto.slug}" already exists`);
    }

    return this.prisma.template.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        subject: dto.subject,
        bodyText: dto.bodyText,
        bodyHtml: dto.bodyHtml,
        defaultChannel: dto.defaultChannel,
        fallbackChannel: dto.fallbackChannel,
        metadata: dto.metadata,
      },
    });
  }

  async findAll() {
    return this.prisma.template.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
    });
    if (!template) {
      throw new NotFoundException(`Template with ID "${id}" not found`);
    }
    return template;
  }

  async findBySlug(slug: string) {
    const template = await this.prisma.template.findUnique({
      where: { slug },
    });
    if (!template) {
      throw new NotFoundException(`Template with slug "${slug}" not found`);
    }
    return template;
  }

  async update(id: string, dto: UpdateTemplateDto) {
    await this.findById(id);
    return this.prisma.template.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string) {
    await this.findById(id);
    return this.prisma.template.delete({
      where: { id },
    });
  }
}
