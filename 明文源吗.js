import { connect } from 'cloudflare:sockets';

let authToken = '5c240cb3-0c29-491a-ad03-32a30aafe25d';
let fallbackAddress = '';
let fallbackPort = '443';
// 动态设置的变量
let dynamicFallbackAddress = '';
let dynamicFallbackPort = '443';



const E_INVALID_DATA = atob('aW52YWxpZCBkYXRh');
const E_INVALID_USER = atob('aW52YWxpZCB1c2Vy');
const E_UNSUPPORTED_CMD = atob('Y29tbWFuZCBpcyBub3Qgc3VwcG9ydGVk');
const E_UDP_DNS_ONLY = atob('VURQIHByb3h5IG9ubHkgZW5hYmxlIGZvciBETlMgd2hpY2ggaXMgcG9ydCA1Mw==');
const E_INVALID_ADDR_TYPE = atob('aW52YWxpZCBhZGRyZXNzVHlwZQ==');
const E_EMPTY_ADDR = atob('YWRkcmVzc1ZhbHVlIGlzIGVtcHR5');
const E_WS_NOT_OPEN = atob('d2ViU29ja2V0LmVhZHlTdGF0ZSBpcyBub3Qgb3Blbg==');
const E_INVALID_ID_STR = atob('U3RyaW5naWZpZWQgaWRlbnRpZmllciBpcyBpbnZhbGlk');

const ADDRESS_TYPE_IPV4 = 1;
const ADDRESS_TYPE_URL = 2;
const ADDRESS_TYPE_IPV6 = 3;

function isValidFormat(str) {
    const userRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return userRegex.test(str);
}





function parseAddressAndPort(input) {
    if (input.includes('[') && input.includes(']')) {
        const match = input.match(/^\[([^\]]+)\](?::(\d+))?$/);
        if (match) {
            return {
                address: match[1],
                port: match[2] ? parseInt(match[2], 10) : null
            };
        }
    }
    
    const lastColonIndex = input.lastIndexOf(':');
    if (lastColonIndex > 0) {
        const address = input.substring(0, lastColonIndex);
        const portStr = input.substring(lastColonIndex + 1);
        const port = parseInt(portStr, 10);
        
        if (!isNaN(port) && port > 0 && port <= 65535) {
            return { address, port };
        }
    }
    
    return { address: input, port: null };
}

export default {
	async fetch(request, env) {
		try {
			const subPath = authToken.toLowerCase();

						
			// 只使用动态设置的值
			if (dynamicFallbackAddress) {
				fallbackAddress = dynamicFallbackAddress;
				fallbackPort = dynamicFallbackPort;
			}

			
			
			
			
			const url = new URL(request.url);

			if (request.headers.get('Upgrade') === 'websocket') {
				return await handleWsRequest(request);
			} else if (request.method === 'GET') {
				if (url.pathname === '/region') {
					// 检查动态设置的值
					if (dynamicFallbackAddress && dynamicFallbackAddress.trim()) {
						const currentAddress = dynamicFallbackPort !== '443'
							? `${dynamicFallbackAddress}:${dynamicFallbackPort}`
							: dynamicFallbackAddress;

						return new Response(JSON.stringify({
							mode: 'DYNAMIC',
							detectionMethod: '动态设置模式',
							customIP: currentAddress,
							source: 'URL参数设置',
							timestamp: new Date().toISOString()
						}), {
							headers: { 'Content-Type': 'application/json' }
						});
					} else {
						return new Response(JSON.stringify({
							mode: 'DEFAULT',
							detectionMethod: '默认模式',
							timestamp: new Date().toISOString()
						}), {
							headers: { 'Content-Type': 'application/json' }
						});
					}
				}
				
				
				// 处理 /proxyip=IP 格式的请求
				if (url.pathname.startsWith('/proxyip=')) {
					const proxyIP = url.pathname.substring(9); // 去掉 "/proxyip=" 前缀

					if (proxyIP && proxyIP.trim()) {
						try {
							// 验证IP或域名格式
							const inputAddress = proxyIP.trim();
							// 支持IP地址、域名，甚至包含端口的格式
							if (inputAddress && inputAddress.length > 0) {
								// 解析地址和端口
								const { address, port } = parseAddressAndPort(inputAddress);

								if (address && address.length > 0) {
									// 更新动态变量
									dynamicFallbackAddress = address;
									dynamicFallbackPort = port ? port.toString() : '443'; // 使用提供的端口或默认端口

									// 同时更新当前运行的变量
									fallbackAddress = dynamicFallbackAddress;
									fallbackPort = dynamicFallbackPort;

									// 返回成功响应
									const responseHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>代理IP设置成功</title>
    <style>
        body {
            font-family: "Courier New", monospace;
            background: #000; color: #00ff00;
            display: flex; justify-content: center; align-items: center;
            min-height: 100vh; margin: 0;
        }
        .container {
            text-align: center;
            padding: 40px;
            border: 2px solid #00ff00;
            border-radius: 10px;
            background: rgba(0, 20, 0, 0.9);
            box-shadow: 0 0 30px rgba(0, 255, 0, 0.5);
        }
        .success { font-size: 24px; margin-bottom: 20px; }
        .ip { font-size: 18px; margin-bottom: 30px; color: #00ffff; }
        .countdown { font-size: 16px; color: #ffff00; }
        a { color: #00ff00; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <div class="success">✅ 代理IP设置成功</div>
        <div class="ip">已设置代理地址: ${fallbackAddress}:${fallbackPort}</div>
        <div class="ip" style="color: #ffff00; font-size: 14px; margin-top: 10px;">优先级: 动态设置 (最高优先级)</div>
        <div class="countdown">3秒后自动跳转到首页...</div>
        <script>
            setTimeout(() => {
                window.location.href = '/';
            }, 3000);
        </script>
        <p><a href="/">立即返回首页</a></p>
    </div>
</body>
</html>`;

								return new Response(responseHtml, {
									status: 200,
									headers: { 'Content-Type': 'text/html; charset=utf-8' }
								});
							} else {
								// IP格式无效
								const errorHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IP格式错误</title>
    <style>
        body {
            font-family: "Courier New", monospace;
            background: #000; color: #ff4444;
            display: flex; justify-content: center; align-items: center;
            min-height: 100vh; margin: 0;
        }
        .container {
            text-align: center;
            padding: 40px;
            border: 2px solid #ff4444;
            border-radius: 10px;
            background: rgba(20, 0, 0, 0.9);
            box-shadow: 0 0 30px rgba(255, 68, 68, 0.5);
        }
        .error { font-size: 24px; margin-bottom: 20px; }
        .ip { font-size: 18px; margin-bottom: 30px; color: #ff6666; }
        a { color: #ff4444; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <div class="error">❌ IP格式错误</div>
        <div class="ip">无效的IP地址: ${proxyIP}</div>
        <p><a href="/">返回首页</a></p>
    </div>
</body>
</html>`;

								return new Response(errorHtml, {
									status: 400,
									headers: { 'Content-Type': 'text/html; charset=utf-8' }
								});
							}
						} catch (e) {
							return new Response(JSON.stringify({
								error: 'IP解析失败',
								message: e.message
							}), {
								status: 500,
								headers: { 'Content-Type': 'application/json' }
							});
						}
					} else {
						// 没有提供IP
						const errorHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>缺少IP参数</title>
    <style>
        body {
            font-family: "Courier New", monospace;
            background: #000; color: #ffaa00;
            display: flex; justify-content: center; align-items: center;
            min-height: 100vh; margin: 0;
        }
        .container {
            text-align: center;
            padding: 40px;
            border: 2px solid #ffaa00;
            border-radius: 10px;
            background: rgba(20, 10, 0, 0.9);
            box-shadow: 0 0 30px rgba(255, 170, 0, 0.5);
        }
        .warning { font-size: 24px; margin-bottom: 20px; }
        .format { font-size: 18px; margin-bottom: 30px; color: #ffcc66; }
        a { color: #ffaa00; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <div class="warning">⚠️ 缺少IP参数</div>
        <div class="format">请使用正确的格式: /proxyip=18.183.172.12</div>
        <p><a href="/">返回首页</a></p>
    </div>
</body>
</html>`;

						return new Response(errorHtml, {
							status: 400,
							headers: { 'Content-Type': 'text/html; charset=utf-8' }
						});
					}
				}
				
				
				if (url.pathname === '/') {
					const terminalHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>终端</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: "Courier New", monospace;
            background: #000; color: #00ff00; min-height: 100vh;
            overflow-x: hidden; position: relative;
            display: flex; justify-content: center; align-items: center;
        }
        .matrix-bg {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: linear-gradient(45deg, #000 0%, #001100 50%, #000 100%);
            z-index: -1;
            animation: bg-pulse 8s ease-in-out infinite;
        }
        @keyframes bg-pulse {
            0%, 100% { background: linear-gradient(45deg, #000 0%, #001100 50%, #000 100%); }
            50% { background: linear-gradient(45deg, #000 0%, #002200 50%, #000 100%); }
        }
        .matrix-rain {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.03) 2px, rgba(0,255,0,0.03) 4px);
            animation: matrix-fall 20s linear infinite;
            z-index: -1;
        }
        @keyframes matrix-fall {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100vh); }
        }
        .matrix-code-rain {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; z-index: -1;
            overflow: hidden;
        }
        .matrix-column {
            position: absolute; top: -100%; left: 0;
            color: #00ff00; font-family: "Courier New", monospace;
            font-size: 14px; line-height: 1.2;
            animation: matrix-drop 15s linear infinite;
            text-shadow: 0 0 5px #00ff00;
        }
        @keyframes matrix-drop {
            0% { top: -100%; opacity: 1; }
            10% { opacity: 1; }
            90% { opacity: 0.3; }
            100% { top: 100vh; opacity: 0; }
        }
        .matrix-column:nth-child(odd) {
            animation-duration: 12s;
            animation-delay: -2s;
        }
        .matrix-column:nth-child(even) {
            animation-duration: 18s;
            animation-delay: -5s;
        }
        .matrix-column:nth-child(3n) {
            animation-duration: 20s;
            animation-delay: -8s;
        }
        .terminal {
            width: 90%; max-width: 800px; height: 500px;
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #00ff00;
            border-radius: 8px;
            box-shadow: 0 0 30px rgba(0, 255, 0, 0.5), inset 0 0 20px rgba(0, 255, 0, 0.1);
            backdrop-filter: blur(10px);
            position: relative; z-index: 1;
            overflow: hidden;
        }
        .terminal-header {
            background: rgba(0, 20, 0, 0.8);
            padding: 10px 15px;
            border-bottom: 1px solid #00ff00;
            display: flex; align-items: center;
        }
        .terminal-buttons {
            display: flex; gap: 8px;
        }
        .terminal-button {
            width: 12px; height: 12px; border-radius: 50%;
            background: #ff5f57; border: none;
        }
        .terminal-button:nth-child(2) { background: #ffbd2e; }
        .terminal-button:nth-child(3) { background: #28ca42; }
        .terminal-title {
            margin-left: 15px; color: #00ff00;
            font-size: 14px; font-weight: bold;
        }
        .terminal-body {
            padding: 20px; height: calc(100% - 50px);
            overflow-y: auto; font-size: 14px;
            line-height: 1.4;
        }
        .terminal-line {
            margin-bottom: 8px; display: flex; align-items: center;
        }
        .terminal-prompt {
            color: #00ff00; margin-right: 10px;
            font-weight: bold;
        }
        .terminal-input {
            background: transparent; border: none; outline: none;
            color: #00ff00; font-family: "Courier New", monospace;
            font-size: 14px; flex: 1;
            caret-color: #00ff00;
        }
        .terminal-input::placeholder {
            color: #00aa00; opacity: 0.7;
        }
        .terminal-cursor {
            display: inline-block; width: 8px; height: 16px;
            background: #00ff00; animation: blink 1s infinite;
            margin-left: 2px;
        }
        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
        }
        .terminal-output {
            color: #00aa00; margin: 5px 0;
        }
        .terminal-error {
            color: #ff4444; margin: 5px 0;
        }
        .terminal-success {
            color: #44ff44; margin: 5px 0;
        }
        .matrix-text {
            position: fixed; top: 20px; right: 20px;
            color: #00ff00; font-family: "Courier New", monospace;
            font-size: 0.8rem; opacity: 0.6;
            animation: matrix-flicker 3s infinite;
        }
        @keyframes matrix-flicker {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="matrix-bg"></div>
    <div class="matrix-rain"></div>
    <div class="matrix-code-rain" id="matrixCodeRain"></div>
    <div class="matrix-text">终端</div>
    <div class="terminal">
        <div class="terminal-header">
            <div class="terminal-buttons">
                <div class="terminal-button"></div>
                <div class="terminal-button"></div>
                <div class="terminal-button"></div>
            </div>
            <div class="terminal-title">终端</div>
        </div>
        <div class="terminal-body" id="terminalBody">
            <div class="terminal-line">
                <span class="terminal-prompt">root:~$</span>
                <span class="terminal-output">恭喜你来到这</span>
            </div>
            <div class="terminal-line">
                <span class="terminal-prompt">root:~$</span>
                <span class="terminal-output">请输入你U变量的值</span>
            </div>
            <div class="terminal-line">
                <span class="terminal-prompt">root:~$</span>
                <span class="terminal-output">命令: connect [UUID]</span>
            </div>
            <div class="terminal-line">
                <span class="terminal-prompt">root:~$</span>
                <input type="text" class="terminal-input" id="uuidInput" placeholder="输入U变量的内容并且回车..." autofocus>
                <span class="terminal-cursor"></span>
            </div>
        </div>
    </div>
    <script>
        function createMatrixRain() {
            const matrixContainer = document.getElementById('matrixCodeRain');
            const matrixChars = '01ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
            const columns = Math.floor(window.innerWidth / 18);
            
            for (let i = 0; i < columns; i++) {
                const column = document.createElement('div');
                column.className = 'matrix-column';
                column.style.left = (i * 18) + 'px';
                column.style.animationDelay = Math.random() * 15 + 's';
                column.style.animationDuration = (Math.random() * 15 + 8) + 's';
                column.style.fontSize = (Math.random() * 4 + 12) + 'px';
                column.style.opacity = Math.random() * 0.8 + 0.2;
                
                let text = '';
                const charCount = Math.floor(Math.random() * 30 + 20);
                for (let j = 0; j < charCount; j++) {
                    const char = matrixChars[Math.floor(Math.random() * matrixChars.length)];
                    const brightness = Math.random() > 0.1 ? '#00ff00' : '#00aa00';
                    text += '<span style="color: ' + brightness + ';">' + char + '</span><br>';
                }
                column.innerHTML = text;
                matrixContainer.appendChild(column);
            }
            
            setInterval(function() {
                const columns = matrixContainer.querySelectorAll('.matrix-column');
                columns.forEach(function(column) {
                    if (Math.random() > 0.95) {
                        const chars = column.querySelectorAll('span');
                        if (chars.length > 0) {
                            const randomChar = chars[Math.floor(Math.random() * chars.length)];
                            randomChar.style.color = '#ffffff';
                            setTimeout(function() {
                                randomChar.style.color = '#00ff00';
                            }, 200);
                        }
                    }
                });
            }, 100);
        }
        
        function isValidUUID(uuid) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            return uuidRegex.test(uuid);
        }
        
        function addTerminalLine(content, type = 'output') {
            const terminalBody = document.getElementById('terminalBody');
            const line = document.createElement('div');
            line.className = 'terminal-line';
            
            const prompt = document.createElement('span');
            prompt.className = 'terminal-prompt';
            prompt.textContent = 'root:~$';
            
            const output = document.createElement('span');
            output.className = 'terminal-' + type;
            output.textContent = content;
            
            line.appendChild(prompt);
            line.appendChild(output);
            terminalBody.appendChild(line);
            
            terminalBody.scrollTop = terminalBody.scrollHeight;
        }
        
        function handleUUIDInput() {
            const input = document.getElementById('uuidInput');
            const uuid = input.value.trim();
            
            if (uuid) {
                addTerminalLine('connect ' + uuid, 'output');
                
                if (isValidUUID(uuid)) {
                    addTerminalLine('正在入侵...', 'output');
                    setTimeout(() => {
                        addTerminalLine('连接成功！返回结果...', 'success');
                        setTimeout(() => {
                            window.location.href = '/' + uuid;
                        }, 1000);
                    }, 500);
                } else {
                    addTerminalLine('错误: 无效的UUID格式', 'error');
                    addTerminalLine('请重新输入有效的UUID', 'output');
                }
                
                input.value = '';
            }
        }
        
        document.addEventListener('DOMContentLoaded', function() {
            createMatrixRain();
            
            const input = document.getElementById('uuidInput');
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    handleUUIDInput();
                }
            });
        });
    </script>
</body>
</html>`;
					return new Response(terminalHtml, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
				}
				if (url.pathname.length > 1 && url.pathname !== '/' && !url.pathname.includes('/sub')) {
					const user = url.pathname.replace(/\/$/, '').substring(1);
					if (isValidFormat(user)) {
						if (user === authToken) {
							return await handleSubscriptionPage(request, user);
						} else {
							return new Response('UUID错误 请注意变量名称是u不是uuid', { status: 403 });
						}
					}
				}
				if (url.pathname.includes('/sub')) {
					const pathParts = url.pathname.split('/');
					if (pathParts.length === 2 && pathParts[1] === 'sub') {
						const user = pathParts[0].substring(1);
						if (isValidFormat(user)) {
							if (user === authToken) {
								return await handleSubscriptionRequest(request, user, url);
							} else {
								return new Response('UUID错误', { status: 403 });
							}
						}
					}
				}
				if (url.pathname.toLowerCase().includes(`/${subPath}`)) {
					return await handleSubscriptionRequest(request, authToken);
				}
			}
			return new Response('Not Found', { status: 404 });
		} catch (err) {
			return new Response(err.toString(), { status: 500 });
		}
	},
};

async function handleSubscriptionRequest(request, user, url = null) {
    if (!url) url = new URL(request.url);

    const finalLinks = [];
    const workerDomain = url.hostname;

    try {
        const nativeList = [{ ip: workerDomain, isp: '原生地址' }];
        finalLinks.push(...generateLinksFromSource(nativeList, user, workerDomain));
    } catch (e) {
        const nativeList = [{ ip: workerDomain, isp: '原生地址' }];
        finalLinks.push(...generateLinksFromSource(nativeList, user, workerDomain));
    }

    
    
    if (finalLinks.length === 0) {
        const errorRemark = "所有节点获取失败";
        const proto = atob('dmxlc3M=');
        const errorLink = `${proto}://00000000-0000-0000-0000-000000000000@127.0.0.1:80?encryption=none&security=none&type=ws&host=error.com&path=%2F#${encodeURIComponent(errorRemark)}`;
        finalLinks.push(errorLink);
    }

    let subscriptionContent;
    let contentType = 'text/plain; charset=utf-8';
    
    // 目前只支持base64格式，其他格式的生成函数需要实现
subscriptionContent = btoa(finalLinks.join('\n'));
    
    return new Response(subscriptionContent, {
        headers: { 
            'Content-Type': contentType,
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
    });
}

function generateLinksFromSource(list, user, workerDomain) {
    const defaultHttpsPorts = [443];
    const defaultHttpPorts = [];
    const links = [];
    const wsPath = encodeURIComponent('/?ed=2048');
    const proto = atob('dmxlc3M=');

    list.forEach(item => {
        const nodeNameBase = item.isp.replace(/\s/g, '_');
        const safeIP = item.ip.includes(':') ? `[${item.ip}]` : item.ip;
        
        let httpsPorts, httpPorts;
        if (item.port) {
            httpsPorts = [item.port];
            httpPorts = [];
        } else {
            httpsPorts = defaultHttpsPorts;
            httpPorts = defaultHttpPorts;
        }

        httpsPorts.forEach(port => {
            const wsNodeName = `${nodeNameBase}-${port}-WS-TLS`;
            
            const wsParams = new URLSearchParams({ 
                encryption: 'none', 
                security: 'tls', 
                sni: workerDomain, 
                fp: 'randomized', 
                type: 'ws', 
                host: workerDomain, 
                path: wsPath 
            });
            links.push(`${proto}://${user}@${safeIP}:${port}?${wsParams.toString()}#${encodeURIComponent(wsNodeName)}`);
        });

        httpPorts.forEach(port => {
            const wsNodeName = `${nodeNameBase}-${port}-WS`;

            const wsParams = new URLSearchParams({
                encryption: 'none',
                security: 'none',
                type: 'ws',
                host: workerDomain,
                path: wsPath
            });
            links.push(`${proto}://${user}@${safeIP}:${port}?${wsParams.toString()}#${encodeURIComponent(wsNodeName)}`);
        });
    });
    return links;
}


async function handleWsRequest(request) {
    const wsPair = new WebSocketPair();
    const [clientSock, serverSock] = Object.values(wsPair);
    serverSock.accept();

    let remoteConnWrapper = { socket: null };
    let isDnsQuery = false;

    const earlyData = request.headers.get('sec-websocket-protocol') || '';
    const readable = makeReadableStream(serverSock, earlyData);

    readable.pipeTo(new WritableStream({
        async write(chunk) {
            if (isDnsQuery) return await forwardUDP(chunk, serverSock, null);
            if (remoteConnWrapper.socket) {
                const writer = remoteConnWrapper.socket.writable.getWriter();
                await writer.write(chunk);
                writer.releaseLock();
                return;
            }
            const { hasError, message, port, hostname, rawIndex, version, isUDP } = parseWsPacketHeader(chunk, authToken);
            if (hasError) throw new Error(message);
            if (isUDP) {
                if (port === 53) isDnsQuery = true;
                else throw new Error(E_UDP_DNS_ONLY);
            }
            const respHeader = new Uint8Array([version[0], 0]);
            const rawData = chunk.slice(rawIndex);
            if (isDnsQuery) return forwardUDP(rawData, serverSock, respHeader);
            await forwardTCP(hostname, port, rawData, serverSock, respHeader, remoteConnWrapper);
        },
    })).catch((err) => { });

    return new Response(null, { status: 101, webSocket: clientSock });
}

async function forwardTCP(host, portNum, rawData, ws, respHeader, remoteConnWrapper) {
    async function connectAndSend(address, port) {
        const remoteSock = connect({ hostname: address, port: port });
        const writer = remoteSock.writable.getWriter();
        await writer.write(rawData);
        writer.releaseLock();
        return remoteSock;
    }

    async function retryConnection() {
        const backupHost = fallbackAddress || host;
        const backupPort = parseInt(fallbackPort, 10) || portNum;

        try {
            const fallbackSocket = await connectAndSend(backupHost, backupPort);
            remoteConnWrapper.socket = fallbackSocket;
            fallbackSocket.closed.catch(() => {}).finally(() => closeSocketQuietly(ws));
            connectStreams(fallbackSocket, ws, respHeader, null);
        } catch (fallbackErr) {
            closeSocketQuietly(ws);
        }
    }

    try {
        const initialSocket = await connectAndSend(host, portNum);
        remoteConnWrapper.socket = initialSocket;
        connectStreams(initialSocket, ws, respHeader, retryConnection);
    } catch (err) {
        retryConnection();
    }
}

function parseWsPacketHeader(chunk, token) {
	if (chunk.byteLength < 24) return { hasError: true, message: E_INVALID_DATA };
	const version = new Uint8Array(chunk.slice(0, 1));
	if (formatIdentifier(new Uint8Array(chunk.slice(1, 17))) !== token) return { hasError: true, message: E_INVALID_USER };
	const optLen = new Uint8Array(chunk.slice(17, 18))[0];
	const cmd = new Uint8Array(chunk.slice(18 + optLen, 19 + optLen))[0];
	let isUDP = false;
	if (cmd === 1) {} else if (cmd === 2) { isUDP = true; } else { return { hasError: true, message: E_UNSUPPORTED_CMD }; }
	const portIdx = 19 + optLen;
	const port = new DataView(chunk.slice(portIdx, portIdx + 2)).getUint16(0);
	let addrIdx = portIdx + 2, addrLen = 0, addrValIdx = addrIdx + 1, hostname = '';
	const addressType = new Uint8Array(chunk.slice(addrIdx, addrValIdx))[0];
	switch (addressType) {
		case ADDRESS_TYPE_IPV4: addrLen = 4; hostname = new Uint8Array(chunk.slice(addrValIdx, addrValIdx + addrLen)).join('.'); break;
		case ADDRESS_TYPE_URL: addrLen = new Uint8Array(chunk.slice(addrValIdx, addrValIdx + 1))[0]; addrValIdx += 1; hostname = new TextDecoder().decode(chunk.slice(addrValIdx, addrValIdx + addrLen)); break;
		case ADDRESS_TYPE_IPV6: addrLen = 16; const ipv6 = []; const ipv6View = new DataView(chunk.slice(addrValIdx, addrValIdx + addrLen)); for (let i = 0; i < 8; i++) ipv6.push(ipv6View.getUint16(i * 2).toString(16)); hostname = ipv6.join(':'); break;
		default: return { hasError: true, message: `${E_INVALID_ADDR_TYPE}: ${addressType}` };
	}
	if (!hostname) return { hasError: true, message: `${E_EMPTY_ADDR}: ${addressType}` };
	return { hasError: false, port, hostname, isUDP, rawIndex: addrValIdx + addrLen, version };
}

function makeReadableStream(socket, earlyDataHeader) {
	let cancelled = false;
	return new ReadableStream({
		start(controller) {
			socket.addEventListener('message', (event) => { if (!cancelled) controller.enqueue(event.data); });
			socket.addEventListener('close', () => { if (!cancelled) { closeSocketQuietly(socket); controller.close(); } });
			socket.addEventListener('error', (err) => controller.error(err));
			const { earlyData, error } = base64ToArray(earlyDataHeader);
			if (error) controller.error(error); else if (earlyData) controller.enqueue(earlyData);
		},
		cancel() { cancelled = true; closeSocketQuietly(socket); }
	});
}

async function connectStreams(remoteSocket, webSocket, headerData, retryFunc) {
	let header = headerData, hasData = false;
	await remoteSocket.readable.pipeTo(
		new WritableStream({
			async write(chunk, controller) {
				hasData = true;
				if (webSocket.readyState !== 1) controller.error(E_WS_NOT_OPEN);
				if (header) { webSocket.send(await new Blob([header, chunk]).arrayBuffer()); header = null; } 
                else { webSocket.send(chunk); }
			},
			abort(reason) { console.error("Readable aborted:", reason); },
		})
	).catch((e) => { console.error("Stream connection error:", e); closeSocketQuietly(webSocket); });
	if (!hasData && retryFunc) retryFunc();
}

async function forwardUDP(udpChunk, webSocket, respHeader) {
	try {
		const tcpSocket = connect({ hostname: '8.8.4.4', port: 53 });
		let header = respHeader;
		const writer = tcpSocket.writable.getWriter();
		await writer.write(udpChunk);
		writer.releaseLock();
		await tcpSocket.readable.pipeTo(new WritableStream({
			async write(chunk) {
				if (webSocket.readyState === 1) {
					if (header) { webSocket.send(await new Blob([header, chunk]).arrayBuffer()); header = null; } 
                    else { webSocket.send(chunk); }
				}
			},
		}));
	} catch (e) { console.error(`DNS forward error: ${e.message}`); }
}


async function handleSubscriptionPage(request, user = null) {
	if (!user) user = authToken;
	
	const pageHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>订阅中心</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: "Courier New", monospace;
            background: #000; color: #00ff00; min-height: 100vh;
            overflow-x: hidden; position: relative;
        }
        .matrix-bg {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: linear-gradient(45deg, #000 0%, #001100 50%, #000 100%);
            z-index: -1;
            animation: bg-pulse 8s ease-in-out infinite;
        }
        @keyframes bg-pulse {
            0%, 100% { background: linear-gradient(45deg, #000 0%, #001100 50%, #000 100%); }
            50% { background: linear-gradient(45deg, #000 0%, #002200 50%, #000 100%); }
        }
        .matrix-rain {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.03) 2px, rgba(0,255,0,0.03) 4px);
            animation: matrix-fall 20s linear infinite;
            z-index: -1;
        }
        @keyframes matrix-fall {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100vh); }
        }
        .matrix-code-rain {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; z-index: -1;
            overflow: hidden;
        }
        .matrix-column {
            position: absolute; top: -100%; left: 0;
            color: #00ff00; font-family: "Courier New", monospace;
            font-size: 14px; line-height: 1.2;
            animation: matrix-drop 15s linear infinite;
            text-shadow: 0 0 5px #00ff00;
        }
        @keyframes matrix-drop {
            0% { top: -100%; opacity: 1; }
            10% { opacity: 1; }
            90% { opacity: 0.3; }
            100% { top: 100vh; opacity: 0; }
        }
        .matrix-column:nth-child(odd) {
            animation-duration: 12s;
            animation-delay: -2s;
        }
        .matrix-column:nth-child(even) {
            animation-duration: 18s;
            animation-delay: -5s;
        }
        .matrix-column:nth-child(3n) {
            animation-duration: 20s;
            animation-delay: -8s;
        }
        .container { max-width: 900px; margin: 0 auto; padding: 20px; position: relative; z-index: 1; }
        .header { text-align: center; margin-bottom: 40px; }
        .title {
            font-size: 3.5rem; font-weight: bold;
            text-shadow: 0 0 10px #00ff00, 0 0 20px #00ff00, 0 0 30px #00ff00, 0 0 40px #00ff00;
            margin-bottom: 10px;
            animation: matrix-glow 1.5s ease-in-out infinite alternate, matrix-pulse 3s ease-in-out infinite;
            position: relative;
            background: linear-gradient(45deg, #00ff00, #00aa00, #00ff00);
            background-size: 200% 200%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        @keyframes matrix-glow {
            from { text-shadow: 0 0 10px #00ff00, 0 0 20px #00ff00, 0 0 30px #00ff00, 0 0 40px #00ff00; }
            to { text-shadow: 0 0 20px #00ff00, 0 0 30px #00ff00, 0 0 40px #00ff00, 0 0 50px #00ff00; }
        }
        @keyframes matrix-pulse {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
        }
        .subtitle { color: #00aa00; margin-bottom: 30px; font-size: 1.2rem; }
        .card {
            background: rgba(0, 20, 0, 0.9);
            border: 2px solid #00ff00;
            border-radius: 0; padding: 30px; margin-bottom: 20px;
            box-shadow: 0 0 30px rgba(0, 255, 0, 0.5), inset 0 0 20px rgba(0, 255, 0, 0.1);
            position: relative;
            backdrop-filter: blur(10px);
            animation: card-glow 4s ease-in-out infinite;
        }
        @keyframes card-glow {
            0%, 100% { box-shadow: 0 0 30px rgba(0, 255, 0, 0.5), inset 0 0 20px rgba(0, 255, 0, 0.1); }
            50% { box-shadow: 0 0 40px rgba(0, 255, 0, 0.7), inset 0 0 30px rgba(0, 255, 0, 0.2); }
        }
        .card::before {
            content: ""; position: absolute; top: 0; left: 0;
            width: 100%; height: 100%;
            background: linear-gradient(45deg, transparent 49%, #00ff00 50%, transparent 51%);
            opacity: 0.2; pointer-events: none;
            animation: scan-line 3s linear infinite;
        }
        @keyframes scan-line {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        .card-title {
            font-size: 1.8rem; margin-bottom: 20px;
            color: #00ff00; text-shadow: 0 0 5px #00ff00;
        }
        .client-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 15px; margin: 20px 0;
        }
        .client-btn {
            background: rgba(0, 20, 0, 0.8);
            border: 2px solid #00ff00;
            padding: 15px 20px; color: #00ff00;
            font-family: "Courier New", monospace; font-weight: bold;
            cursor: pointer; transition: all 0.4s ease;
            text-align: center; position: relative;
            overflow: hidden;
            text-shadow: 0 0 5px #00ff00;
            box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
        }
        .client-btn::before {
            content: ""; position: absolute; top: 0; left: -100%;
            width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(0,255,0,0.4), transparent);
            transition: left 0.6s ease;
        }
        .client-btn::after {
            content: ""; position: absolute; top: 0; left: 0;
            width: 100%; height: 100%;
            background: linear-gradient(45deg, transparent 30%, rgba(0,255,0,0.1) 50%, transparent 70%);
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        .client-btn:hover::before { left: 100%; }
        .client-btn:hover::after { opacity: 1; }
        .client-btn:hover {
            background: rgba(0, 255, 0, 0.3);
            box-shadow: 0 0 25px #00ff00, 0 0 35px rgba(0, 255, 0, 0.5);
            transform: translateY(-3px) scale(1.05);
            text-shadow: 0 0 10px #00ff00, 0 0 20px #00ff00;
        }
        .generate-btn {
            background: rgba(0, 255, 0, 0.15);
            border: 2px solid #00ff00; padding: 15px 30px;
            color: #00ff00; font-family: "Courier New", monospace;
            font-weight: bold; cursor: pointer;
            transition: all 0.4s ease; margin-right: 15px;
            text-shadow: 0 0 8px #00ff00;
            box-shadow: 0 0 15px rgba(0, 255, 0, 0.4);
            position: relative;
            overflow: hidden;
        }
        .generate-btn::before {
            content: ""; position: absolute; top: 0; left: -100%;
            width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(0,255,0,0.5), transparent);
            transition: left 0.8s ease;
        }
        .generate-btn:hover::before { left: 100%; }
        .generate-btn:hover {
            background: rgba(0, 255, 0, 0.4);
            box-shadow: 0 0 30px #00ff00, 0 0 40px rgba(0, 255, 0, 0.6);
            transform: translateY(-4px) scale(1.08);
            text-shadow: 0 0 15px #00ff00, 0 0 25px #00ff00;
        }
        .subscription-url {
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #00ff00; padding: 15px;
            word-break: break-all; font-family: "Courier New", monospace;
            color: #00ff00; margin-top: 20px; display: none;
            box-shadow: inset 0 0 15px rgba(0, 255, 0, 0.4), 0 0 20px rgba(0, 255, 0, 0.3);
            border-radius: 5px;
            animation: url-glow 2s ease-in-out infinite alternate;
            position: relative;
            overflow: hidden;
        }
        @keyframes url-glow {
            from { box-shadow: inset 0 0 15px rgba(0, 255, 0, 0.4), 0 0 20px rgba(0, 255, 0, 0.3); }
            to { box-shadow: inset 0 0 20px rgba(0, 255, 0, 0.6), 0 0 30px rgba(0, 255, 0, 0.5); }
        }
        .subscription-url::before {
            content: ""; position: absolute; top: 0; left: -100%;
            width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(0,255,0,0.1), transparent);
            animation: url-scan 3s linear infinite;
        }
        @keyframes url-scan {
            0% { left: -100%; }
            100% { left: 100%; }
        }
        .matrix-text {
            position: fixed; top: 20px; right: 20px;
            color: #00ff00; font-family: "Courier New", monospace;
            font-size: 0.8rem; opacity: 0.6;
            animation: matrix-flicker 3s infinite;
        }
        @keyframes matrix-flicker {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="matrix-bg"></div>
    <div class="matrix-rain"></div>
    <div class="matrix-code-rain" id="matrixCodeRain"></div>
    <div class="matrix-text">代理订阅中心 v1.1</div>
    <div class="container">
        <div class="header">
            <h1 class="title">代理订阅中心</h1>
            <p class="subtitle">Base64订阅 • 简单稳定 • 一键生成</p>
        </div>
        <div class="card">
            <h2 class="card-title">[ 选择客户端 ]</h2>
            <div class="client-grid">
                <button class="client-btn" onclick="generateClientLink()">获取订阅链接</button>
            </div>
            <div class="subscription-url" id="clientSubscriptionUrl"></div>
        </div>
        <div class="card">
            <h2 class="card-title">[ 快速获取 ]</h2>
            <button class="generate-btn" onclick="getBase64Subscription()">获取订阅链接</button>
            <div class="subscription-url" id="base64SubscriptionUrl"></div>
        </div>
        <div class="card">
            <h2 class="card-title">[ 系统状态 ]</h2>
            <div id="systemStatus" style="margin: 20px 0; padding: 15px; background: rgba(0, 20, 0, 0.8); border: 2px solid #00ff00; box-shadow: 0 0 20px rgba(0, 255, 0, 0.3), inset 0 0 15px rgba(0, 255, 0, 0.1); position: relative; overflow: hidden;">
                <div style="color: #00ff00; margin-bottom: 15px; font-weight: bold; text-shadow: 0 0 5px #00ff00;">[ 系统检测中... ]</div>
                <div id="regionStatus" style="margin: 8px 0; color: #00ff00; font-family: 'Courier New', monospace; text-shadow: 0 0 3px #00ff00;">Worker地区: 检测中...</div>
                <div id="geoInfo" style="margin: 8px 0; color: #00aa00; font-family: 'Courier New', monospace; font-size: 0.9rem; text-shadow: 0 0 3px #00aa00;">检测方式: 检测中...</div>
                <div id="backupStatus" style="margin: 8px 0; color: #00ff00; font-family: 'Courier New', monospace; text-shadow: 0 0 3px #00ff00;">ProxyIP状态: 检测中...</div>
                <div id="currentIP" style="margin: 8px 0; color: #00ff00; font-family: 'Courier New', monospace; text-shadow: 0 0 3px #00ff00;">当前使用IP: 检测中...</div>
                <div id="regionMatch" style="margin: 8px 0; color: #00ff00; font-family: 'Courier New', monospace; text-shadow: 0 0 3px #00ff00;">地区匹配: 检测中...</div>
                <div id="selectionLogic" style="margin: 8px 0; color: #00aa00; font-family: 'Courier New', monospace; font-size: 0.9rem; text-shadow: 0 0 3px #00aa00;">选择逻辑: 使用固定配置地址</div>
            </div>
        </div>
        <div class="card">
            <h2 class="card-title">[ 相关链接 ]</h2>
            <div style="text-align: center; margin: 20px 0;">
                <a href="https://github.com/byJoey/cfnew" target="_blank" style="color: #00ff00; text-decoration: none; margin: 0 20px; font-size: 1.2rem; text-shadow: 0 0 5px #00ff00;">GitHub 项目</a>
                <a href="https://www.youtube.com/@joeyblog" target="_blank" style="color: #00ff00; text-decoration: none; margin: 0 20px; font-size: 1.2rem; text-shadow: 0 0 5px #00ff00;">YouTube @joeyblog</a>
            </div>
        </div>
    </div>
    <script>
        function generateClientLink(clientType) {
            var currentUrl = window.location.href;
            var subscriptionUrl = currentUrl + "/sub";

            document.getElementById("clientSubscriptionUrl").textContent = subscriptionUrl;
            document.getElementById("clientSubscriptionUrl").style.display = "block";
            navigator.clipboard.writeText(subscriptionUrl).then(function() {
                alert("Base64订阅链接已复制");
            });
        }
        function getBase64Subscription() {
            var currentUrl = window.location.href;
            var subscriptionUrl = currentUrl + "/sub";
            
            fetch(subscriptionUrl)
                .then(function(response) {
                    return response.text();
                })
                .then(function(base64Content) {
                    document.getElementById("base64SubscriptionUrl").textContent = base64Content;
                    document.getElementById("base64SubscriptionUrl").style.display = "block";
                    navigator.clipboard.writeText(base64Content).then(function() {
                        alert("Base64订阅内容已复制");
                    });
                })
                .catch(function(e) {
                    console.error("获取订阅失败:", e);
                    alert("获取订阅失败，请重试");
                });
        }
        
        function createMatrixRain() {
            const matrixContainer = document.getElementById('matrixCodeRain');
            const matrixChars = '01ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
            const columns = Math.floor(window.innerWidth / 18);
            
            for (let i = 0; i < columns; i++) {
                const column = document.createElement('div');
                column.className = 'matrix-column';
                column.style.left = (i * 18) + 'px';
                column.style.animationDelay = Math.random() * 15 + 's';
                column.style.animationDuration = (Math.random() * 15 + 8) + 's';
                column.style.fontSize = (Math.random() * 4 + 12) + 'px';
                column.style.opacity = Math.random() * 0.8 + 0.2;
                
                let text = '';
                const charCount = Math.floor(Math.random() * 30 + 20);
                for (let j = 0; j < charCount; j++) {
                    const char = matrixChars[Math.floor(Math.random() * matrixChars.length)];
                    const brightness = Math.random() > 0.1 ? '#00ff00' : '#00aa00';
                    text += '<span style="color: ' + brightness + ';">' + char + '</span><br>';
                }
                column.innerHTML = text;
                matrixContainer.appendChild(column);
            }
            
            setInterval(function() {
                const columns = matrixContainer.querySelectorAll('.matrix-column');
                columns.forEach(function(column) {
                    if (Math.random() > 0.95) {
                        const chars = column.querySelectorAll('span');
                        if (chars.length > 0) {
                            const randomChar = chars[Math.floor(Math.random() * chars.length)];
                            randomChar.style.color = '#ffffff';
                            setTimeout(function() {
                                randomChar.style.color = '#00ff00';
                            }, 200);
                        }
                    }
                });
            }, 100);
        }
        
        async function checkSystemStatus() {
            try {
                const regionStatus = document.getElementById('regionStatus');
                const geoInfo = document.getElementById('geoInfo');
                const backupStatus = document.getElementById('backupStatus');
                const currentIP = document.getElementById('currentIP');
                const regionMatch = document.getElementById('regionMatch');

                try {
                    const response = await fetch('/region');
                    const data = await response.json();

                    if (data.mode === 'DYNAMIC') {
                        // 动态设置模式
                        geoInfo.innerHTML = '运行模式: <span style="color: #00ffff;">🚀 动态设置模式</span>';
                        regionStatus.innerHTML = '服务状态: <span style="color: #00ffff;">⭐ 动态IP (已设置)</span>';
                        backupStatus.innerHTML = '备用地址: <span style="color: #00ffff;">✅ ' + data.customIP + '</span>';
                        currentIP.innerHTML = '来源: <span style="color: #00ffff;">' + data.source + '</span>';
                        regionMatch.innerHTML = '优先级: <span style="color: #00ffff;">🎯 动态设置 > 默认</span>';
                    } else {
                        // 默认模式
                        geoInfo.innerHTML = '运行模式: <span style="color: #44ff44;">🔵 默认模式</span>';
                        regionStatus.innerHTML = '服务状态: <span style="color: #44ff44;">✅ 正常运行 (未设置)</span>';
                        backupStatus.innerHTML = '备用地址: <span style="color: #44ff44;">📍 使用原始地址</span>';
                        currentIP.innerHTML = 'IP选择: <span style="color: #44ff44;">🔗 直接连接</span>';
                        regionMatch.innerHTML = '优先级: <span style="color: #44ff44;">📊 动态设置 > 默认</span>';
                    }

                } catch (e) {
                    geoInfo.innerHTML = '运行模式: <span style="color: #ff4444;">❌ 检测失败</span>';
                    regionStatus.innerHTML = '服务状态: <span style="color: #ff4444;">❌ 检测失败</span>';
                }

            } catch (e) {
                console.error('状态检测失败:', e);
                document.getElementById('regionStatus').innerHTML = '服务状态: <span style="color: #ff4444;">❌ 检测失败</span>';
                document.getElementById('geoInfo').innerHTML = '运行模式: <span style="color: #ff4444;">❌ 检测失败</span>';
                document.getElementById('backupStatus').innerHTML = '备用地址: <span style="color: #ff4444;">❌ 检测失败</span>';
                document.getElementById('currentIP').innerHTML = 'IP选择: <span style="color: #ff4444;">❌ 检测失败</span>';
                document.getElementById('regionMatch').innerHTML = '优先级: <span style="color: #ff4444;">❌ 检测失败</span>';
            }
        }
        
                
        
        document.addEventListener('DOMContentLoaded', function() {
            createMatrixRain();
            checkSystemStatus();
        });
    </script>
</body>
</html>`;
	
	return new Response(pageHtml, { 
		status: 200, 
		headers: { 'Content-Type': 'text/html; charset=utf-8' } 
	});
}

function base64ToArray(b64Str) {
	if (!b64Str) return { error: null };
	try { b64Str = b64Str.replace(/-/g, '+').replace(/_/g, '/'); return { earlyData: Uint8Array.from(atob(b64Str), (c) => c.charCodeAt(0)).buffer, error: null }; } 
    catch (e) { return { error: e }; }
}

function closeSocketQuietly(socket) { try { if (socket.readyState === 1 || socket.readyState === 2) socket.close(); } catch (e) {} }

const hexTable = Array.from({ length: 256 }, (v, i) => (i + 256).toString(16).slice(1));
function formatIdentifier(arr, offset = 0) {
	const id = (hexTable[arr[offset]]+hexTable[arr[offset+1]]+hexTable[arr[offset+2]]+hexTable[arr[offset+3]]+"-"+hexTable[arr[offset+4]]+hexTable[arr[offset+5]]+"-"+hexTable[arr[offset+6]]+hexTable[arr[offset+7]]+"-"+hexTable[arr[offset+8]]+hexTable[arr[offset+9]]+"-"+hexTable[arr[offset+10]]+hexTable[arr[offset+11]]+hexTable[arr[offset+12]]+hexTable[arr[offset+13]]+hexTable[arr[offset+14]]+hexTable[arr[offset+15]]).toLowerCase();
	if (!isValidFormat(id)) throw new TypeError(E_INVALID_ID_STR);
	return id;
}

