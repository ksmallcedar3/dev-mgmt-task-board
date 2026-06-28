import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Basic Auth ミドルウェア。
 * 環境変数 BASIC_AUTH_USER / BASIC_AUTH_PASSWORD が設定されている場合に有効化。
 * 未設定のままローカル開発する場合は認証をスキップする。
 */
export function middleware(request: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASSWORD;

  // 環境変数が未設定なら認証スキップ（ローカル開発用フォールバック）
  if (!user || !pass) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Basic ")) {
    const encoded = authHeader.slice(6);
    const decoded = atob(encoded);
    const [inputUser, ...rest] = decoded.split(":");
    const inputPass = rest.join(":");
    if (inputUser === user && inputPass === pass) {
      return NextResponse.next();
    }
  }

  return new NextResponse("認証が必要です", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="開発管理課タスク状況管理", charset="UTF-8"',
    },
  });
}

export const config = {
  // _next/static・_next/image・favicon は認証対象外
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
