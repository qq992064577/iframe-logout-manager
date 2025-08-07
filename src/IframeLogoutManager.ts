/**
 * ```
 * IframeLogoutManager 工具类;
 * 负责创建和管理其他子系统的 iframe，实现跨子系统的登出通知;
 * 支持向多个子系统发送 SSO_LOGOUT 消息，封装了加载成功、失败、完成的回调处理;
 * 纯工具类，不包含业务逻辑;
 * 使用示例：
 * 
 * 1. 引入IframeLogoutManager
 * 
 * 2. debug 模式控制日志输出（不需要日志输出，可以省略）
 * IframeLogoutManager.setDebug(false); // 禁用日志输出（默认）
 * IframeLogoutManager.setDebug(true);  // 开启日志输出
 * 
 * 3. 向多个子系统发送登出通知
 * IframeLogoutManager.logout({
 *   logoutClients: [
 *     {
 *       clientId: 'project-a',
 *       postLogoutRedirectUri: 'https://project-a.example.com/logout-callback'
 *     }
 *   ],
 *   success: (successList) => {
 *     IframeLogoutManager.log('成功通知的系统:', successList);
 *   },
 *   fail: (failedList) => {
 *     IframeLogoutManager.log('通知失败的系统:', failedList);
 *   },
 *   complete: ({ successList, failedList }) => {
 *     IframeLogoutManager.log('所有系统通知完成', successList, failedList);
 *   }
 * });
 * 
 * 4. 手动销毁所有创建的 iframe
 * IframeLogoutManager.destroy();
 * ```
 */

export class IframeLogoutManager {
    static #debug = false;
    static #createdIframes = new Set<HTMLIFrameElement>();

    static setDebug(flag: boolean) {
        this.#debug = flag;
    }

    static log(...args: any[]) {
        if (this.#debug) {
            console.log('[IframeLogoutManager]', ...args);
        }
    }

    static warn(...args: any[]) {
        if (this.#debug) {
            console.warn('[IframeLogoutManager]', ...args);
        }
    }


    /**
     * 通过 iframe 向所有子系统发送 logout 消息
     * @param {Object} options
     * @param {Array} options.logoutClients - 子系统配置列表 [{ clientId, postLogoutRedirectUri }]
     * @param {string} [options.type='SSO_LOGOUT'] - 消息类型
     * @param {boolean} [options.autoDestroy=true] - 是否在完成后自动销毁 iframe
     * @param {Function} [options.success] - 成功回调，参数为成功的系统列表
     * @param {Function} [options.fail] - 失败回调，参数为失败的系统列表
     * @param {Function} [options.complete] - 完成回调，参数为 { successList, failedList }
     */
    static logout(options: {
        logoutClients: { clientId: string; postLogoutRedirectUri: string }[];
        type?: string;
        autoDestroy?: boolean;
        success?: (list: any[]) => void;
        fail?: (list: any[]) => void;
        complete?: (result: { successList: any[]; failedList: any[] }) => void;
    }) {
        const {
            logoutClients = [],
            type = 'SSO_LOGOUT',
            autoDestroy = true,
            success = () => { },
            fail = () => { },
            complete = () => { },
        } = options;

        const loadPromises: Promise<void>[] = [];
        const successList: any[] = [];
        const failedList: any[] = [];

        logoutClients.forEach((project) => {
            const iframeId = `logout-iframe-${project.clientId}`;
            if (document.getElementById(iframeId)) return;

            const iframe = document.createElement('iframe');
            iframe.id = iframeId;
            iframe.title = `${project.clientId} logout iframe`;
            iframe.style.display = 'none';
            iframe.src = project.postLogoutRedirectUri;

            const loadPromise = new Promise<void>((resolve) => {
                iframe.onload = () => {
                    this.log(`✅ iframe ${project.clientId} 加载成功`);
                    try {
                        iframe.contentWindow?.postMessage({ type }, project.postLogoutRedirectUri);
                    } catch (err) {
                        this.warn(`⚠️ postMessage 到 ${project.clientId} 失败`, err);
                    }
                    successList.push(project);
                    resolve();
                };

                iframe.onerror = () => {
                    this.warn(`❌ iframe ${project.clientId} 加载失败`);
                    failedList.push(project);
                    resolve();
                };
            });

            loadPromises.push(loadPromise);
            this.#createdIframes.add(iframe);
            document.body.appendChild(iframe);
        });

        Promise.all(loadPromises).then(() => {
            if (successList.length) success(successList);
            if (failedList.length) fail(failedList);
            complete({ successList, failedList });
            if (autoDestroy) this.destroy();
        });
    }

    /**
     * 手动销毁所有通过该工具类创建的 iframe
     */
    static destroy() {
        this.#createdIframes.forEach((iframe) => {
            try {
                iframe.remove();
            } catch (e) {
                this.warn('⚠️ 销毁 iframe 失败:', e);
            }
        });
        this.#createdIframes.clear();
        this.log('🧹 所有 iframe 已销毁');
    }
}
