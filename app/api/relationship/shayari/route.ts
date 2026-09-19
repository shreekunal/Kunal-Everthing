import { NextRequest } from "next/server";
import { POST as messagesPost } from "../messages/route";

export async function GET(req: NextRequest) {
  return messagesPost(req);
}

export async function POST(req: NextRequest) {
  return messagesPost(req);
}
