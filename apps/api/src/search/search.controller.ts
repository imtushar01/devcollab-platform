import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { RateLimit } from '../common/guards/rate-limit.guard';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @RateLimit({ windowMs: 60 * 1000, max: 30, keyPrefix: 'search' })
  search(
    @Query('q') query: string,
    @Query('type') type: string,
    @Query('limit') limit: string,
  ) {
    if (!query?.trim()) return [];
    return this.searchService.search(query, type, parseInt(limit ?? '10'));
  }

  @Post('reindex')
  async reindex() {
    await this.searchService.reindexRepositories();
    return { message: 'Reindex complete' };
  }
}