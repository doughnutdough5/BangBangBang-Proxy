import net from 'net';

class TcpProxy {
  constructor(proxyPort, serviceHost, servicePort, options) {
    this.proxyPort = proxyPort;
    this.serviceHosts = this.parse(serviceHost);
    this.servicePorts = this.parse(servicePort);
    this.serviceHostIndex = -1;
    this.options = this.parseOptions(options);
    this.proxySockets = {};
    if (this.options.identUsers.length !== 0) {
      this.users = this.options.identUsers;
      this.log('Will only allow these users: '.concat(this.users.join(', ')));
    } else {
      this.log('Will allow all users');
    }
    if (this.options.allowedIPs.length !== 0) {
      this.allowedIPs = this.options.allowedIPs;
    }
    this.createListener();
  }

  parseOptions(options) {
    return Object.assign(
      {
        quiet: true,
        rejectUnauthorized: true,
        identUsers: [],
        allowedIPs: [],
      },
      options,
    );
  }

  parse(o) {
    if (typeof o === 'string') {
      return o.split(',');
    } else if (typeof o === 'number') {
      return this.parse(o.toString());
    } else if (Array.isArray(o)) {
      return o;
    } else {
      throw new Error('cannot parse object: ' + o);
    }
  }

  createListener() {
    this.server = net.createServer((socket) => {
      this.handleClientConnection(socket);
    });
    this.server.listen(this.proxyPort, this.options.hostname);
  }

  handleClientConnection(socket) {
    if (this.users) {
      this.handleAuth(socket);
    } else {
      this.handleClient(socket);
    }
  }

  handleAuth(proxySocket) {
    if (this.allowedIPs.includes(proxySocket.remoteAddress)) {
      this.handleClient(proxySocket);
      return;
    }
    this.log('Authentication is required but no authentication logic provided.');
    proxySocket.destroy();
  }

  handleClient(proxySocket) {
    const key = `${proxySocket.remoteAddress}:${proxySocket.remotePort}`;
    this.proxySockets[key] = proxySocket;
    const context = {
      buffers: [],
      connected: false,
      proxySocket,
    };
    proxySocket.on('data', (data) => {
      this.handleUpstreamData(context, data);
    });
    proxySocket.on('close', () => {
      delete this.proxySockets[key];
      if (context.serviceSocket) {
        context.serviceSocket.destroy();
      }
    });
    proxySocket.on('error', () => {
      if (context.serviceSocket) {
        context.serviceSocket.destroy();
      }
    });
  }

  handleUpstreamData(context, data) {
    Promise.resolve(this.intercept(this.options.upstream, context, data)).then((processedData) => {
      if (context.connected) {
        context.serviceSocket.write(processedData);
      } else {
        context.buffers.push(processedData);
        if (!context.serviceSocket) {
          this.createServiceSocket(context);
        }
      }
    });
  }

  createServiceSocket(context) {
    const options = this.parseServiceOptions(context);
    context.serviceSocket = new net.Socket();
    context.serviceSocket.connect(options, () => {
      this.writeBuffer(context);
    });
    context.serviceSocket.on('data', (data) => {
      Promise.resolve(this.intercept(this.options.downstream, context, data)).then(
        (processedData) => context.proxySocket.write(processedData),
      );
    });
    context.serviceSocket.on('close', () => {
      if (context.proxySocket) {
        context.proxySocket.destroy();
      }
    });
    context.serviceSocket.on('error', () => {
      if (context.proxySocket) {
        context.proxySocket.destroy();
      }
    });
  }

  parseServiceOptions(context) {
    const i = this.getServiceHostIndex(context.proxySocket);
    return {
      port: this.servicePorts[i],
      host: this.serviceHosts[i],
      localAddress: this.options.localAddress,
      localPort: this.options.localPort,
    };
  }

  getServiceHostIndex() {
    // 라우팅 헤더를 기반으로 동적으로 결정되도록 변경
    if (this.serviceHostIndex !== -1) {
      return this.serviceHostIndex;
    }
    this.serviceHostIndex = (this.serviceHostIndex + 1) % this.serviceHosts.length;
    return this.serviceHostIndex;
  }

  writeBuffer(context) {
    context.connected = true;
    context.buffers.forEach((buffer) => {
      context.serviceSocket.write(buffer);
    });
  }

  end() {
    this.server.close();
    Object.values(this.proxySockets).forEach((socket) => socket.destroy());
    this.server.unref();
  }

  log(msg) {
    if (!this.options.quiet) {
      console.log(msg);
    }
  }

  intercept(interceptor, context, data) {
    return interceptor ? interceptor(context, data) : data;
  }
}

export default TcpProxy;
