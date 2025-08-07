# iframe-logout-manager

> 跨系统 iframe 工具类（TS/JS 兼容），包含登出消息发送与接收

## 包含功能

- `IframeLogoutManager`: 向多个系统发送 `SSO_LOGOUT` 消息
- `IframeMessageManager`: 在子系统中监听和处理消息

## 安装

```bash
npm install iframe-logout-manager
```

## 使用示例

### 发送登出消息

```ts
import { IframeLogoutManager } from 'iframe-logout-manager';

IframeLogoutManager.logout({
  logoutClients: [
    { clientId: 'system-a', postLogoutRedirectUri: 'https://a.example.com/logout' }
  ],
  complete({ successList, failedList }) {
    console.log('完成', successList, failedList);
  },
});
```

### 监听登出消息

```ts
import { IframeMessageManager } from 'iframe-logout-manager';

IframeMessageManager.init({ validOrigins: ['https://a.example.com'] });

IframeMessageManager.on('SSO_LOGOUT', (data, origin) => {
  console.log('收到来自', origin, '的登出请求');
  // 执行本地登出逻辑
});
```

## License

MIT
