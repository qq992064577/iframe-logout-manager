/**
 * IframeMessageManager 工具类;
 * 监听跨系统 iframe 消息，提供基础通信功能;
 * 纯工具类，不包含业务逻辑;
 * 
 * 使用示例：
 * IframeMessageManager.init({
 *   validOrigins: ['https://auth.example.com', 'https://a.example.com'],
 * });
 * 
 * IframeMessageManager.on('SSO_LOGOUT', (data, origin) => {
 *   // 处理登出逻辑
 * });
 */
export class IframeMessageManager {
  static #isInitialized = false;
  static #validOrigins: string[] = [];
  static #originRules: RegExp[] = [];
  static #messageHandlers = new Map<string, (data: any, origin: string) => void>();

  /**
   * 编译 origin 字符串为正则表达式
   */
  static #compileOriginRule(originPattern: string): RegExp {
    if (originPattern === '*') return /.*/;
    const escaped = originPattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/:\*/g, '(:\\d+)?'); // 支持端口通配
    return new RegExp(`^${escaped}$`);
  }

  /**
   * 初始化监听器
   * @param options 
   */
  static init({ validOrigins = [] }: { validOrigins?: string[] } = {}) {
    if (this.#isInitialized) return;

    this.#validOrigins = validOrigins;
    this.#originRules = validOrigins.map(this.#compileOriginRule);
    window.addEventListener('message', this.#handleMessage.bind(this));
    this.#isInitialized = true;

    this.log('✅ 初始化完成，监听消息中...');
  }

  /**
   * 注册消息监听器
   * @param messageType 消息类型
   * @param handler 回调函数
   */
  static on(messageType: string, handler: (data: any, origin: string) => void) {
    this.#messageHandlers.set(messageType, handler);
  }

  /**
   * 移除某类消息监听
   */
  static off(messageType: string) {
    this.#messageHandlers.delete(messageType);
  }

  /**
   * 向父窗口发送消息
   */
  static sendToParent(message: any) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, '*');
    }
  }

  /**
   * 向指定窗口发送消息
   */
  static sendToWindow(targetWindow: Window, message: any) {
    if (targetWindow) {
      targetWindow.postMessage(message, '*');
    }
  }

  /**
   * 内部处理消息接收
   */
  static #handleMessage(event: MessageEvent) {
    const origin = event.origin;
    const data = event.data;

    const isValid = this.#originRules.some((rule) => rule.test(origin));
    if (!isValid) {
      this.warn(`⚠️ 非法消息来源: ${origin}`);
      return;
    }

    const handler = this.#messageHandlers.get(data.type);
    if (handler) {
      handler(data, origin);
    } else {
      this.log(`📭 未注册消息类型: ${data.type}`);
    }
  }

  /**
   * 清理所有监听器和状态
   */
  static destroy() {
    this.#messageHandlers.clear();
    this.#validOrigins = [];
    this.#originRules = [];
    this.#isInitialized = false;
    this.log('🧹 已销毁 IframeMessageManager');
  }

  /** 日志输出 */
  static log(...args: any[]) {
    console.log('[IframeMessageManager]', ...args);
  }

  /** 警告输出 */
  static warn(...args: any[]) {
    console.warn('[IframeMessageManager]', ...args);
  }
}
