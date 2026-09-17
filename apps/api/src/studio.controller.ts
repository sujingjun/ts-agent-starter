import { Controller, Get, Post, Body, Param, UseGuards, Sse, Query, Inject, Header } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { z } from 'zod';
import { TokenGuard } from './auth.guard.js';
import { StudioHost } from '../../../integrations/langchain/host.js';
export const STUDIO=Symbol('STUDIO');
@Controller('api/studio')
@UseGuards(TokenGuard)
export class StudioController {
  constructor(@Inject(STUDIO) private readonly host:StudioHost) {}
  @Get('capabilities') capabilities(){return this.host.capabilities();}
  @Get('runs') list(){return this.host.list();}
  @Post('runs') create(@Body() body:unknown){
    const value=z.object({engine:z.enum(['agent','research']),prompt:z.string().trim().min(1).max(16000),skill:z.string().max(64).optional(),previousRunId:z.string().uuid().optional()}).strict().parse(body);
    return this.host.create({engine:value.engine,prompt:value.prompt,...(value.skill?{skill:value.skill}:{}),...(value.previousRunId?{previousRunId:value.previousRunId}:{})});
  }
  @Get('runs/:id') get(@Param('id') id:string){return this.host.get(z.string().uuid().parse(id));}
  @Post('runs/:id/approve') approve(@Param('id') id:string,@Body() body:unknown){return this.host.approve(z.string().uuid().parse(id),z.object({allow:z.boolean()}).strict().parse(body).allow);}
  @Post('runs/:id/cancel') cancel(@Param('id') id:string){return this.host.cancel(z.string().uuid().parse(id));}
  @Post('runs/:id/resume') resume(@Param('id') id:string){return this.host.resume(z.string().uuid().parse(id));}
  @Get('runs/:id/history') history(@Param('id') id:string){return this.host.history(z.string().uuid().parse(id));}
  @Get('runs/:id/artifact')
  @Header('Content-Disposition','attachment; filename="research-report.json"')
  artifact(@Param('id') id:string){return this.host.artifact(z.string().uuid().parse(id));}
  @Sse('runs/:id/events') async events(@Param('id') id:string,@Query('after') after?:string):Promise<Observable<MessageEvent>> {
    await this.get(id);let cursor=z.coerce.number().int().nonnegative().parse(after??0);
    return new Observable(subscriber=>{
      let stopped=false;let reading=false;
      const poll=async()=>{
        if(stopped||reading)return;reading=true;
        try {
          const state=await this.host.get(id); if(stopped)return;
          for(const event of state.events) if(event.seq>cursor) {subscriber.next({id:String(event.seq),type:'agent',data:event});cursor=event.seq;}
          if(['completed','failed','cancelled','waiting_approval'].includes(state.status))subscriber.complete();
        } catch(e){if(!stopped)subscriber.error(e);} finally{reading=false;}
      };
      const timer=setInterval(()=>void poll(),120);void poll();
      return ()=>{stopped=true;clearInterval(timer);};
    });
  }
}
