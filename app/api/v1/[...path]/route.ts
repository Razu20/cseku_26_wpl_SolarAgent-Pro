/* eslint-disable no-undef, no-empty */
import { NextRequest } from 'next/server';
import { apiRouter } from '../../../../src/api';
import { createRequest, createResponse } from '../../../../src/lib/router';
async function handler(request:NextRequest) { let body:any={}; if(request.method!=='GET'&&request.method!=='HEAD'&&request.method!=='DELETE'){try{body=await request.json();}catch{}} const req=createRequest(request,body); const res=createResponse(); const pathname=request.nextUrl.pathname.replace(/^\/api\/v1/,'')||'/'; const found=await apiRouter.dispatch(req,res,pathname); if(!found) return Response.json({error:'route_not_found'},{status:404}); return res.response || Response.json({error:'internal_server_error'},{status:500}); }
export const GET=handler; export const HEAD=handler; export const POST=handler; export const PATCH=handler; export const PUT=handler; export const DELETE=handler; export const OPTIONS=handler;


