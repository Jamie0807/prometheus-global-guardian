/** 为 Express 请求扩展原始请求体字段的类型声明。 */
declare namespace Express {
  interface Request {
    rawBody?: Buffer;
  }
}
