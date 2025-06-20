import React from 'react';
import { Typography, Card, Row, Col, Statistic, Space, Alert } from 'antd';
import {
  DesktopOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useAppStore, selectors } from '../store/index.jsx';
import StateTest from '../components/StateTest';

const { Title, Paragraph } = Typography;

const Dashboard = () => {
  const { state } = useAppStore();

  // 从状态中获取统计数据
  const totalInstances = selectors.getInstances(state).length;
  const runningInstances = selectors.getRunningInstances(state).length;
  const stoppedInstances = totalInstances - runningInstances;
  const systemHealthy = selectors.getSystemStatus(state).healthy;

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>仪表板</Title>
      <Paragraph>
        欢迎使用 CodeStudio Pro Ultimate 3.0 - 多实例VS Code协同开发系统
      </Paragraph>

      <Alert
        message="系统状态"
        description={systemHealthy ? "系统运行正常" : "系统状态异常，请检查服务"}
        type={systemHealthy ? "success" : "warning"}
        showIcon
        style={{ marginBottom: '24px' }}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总实例数"
              value={totalInstances}
              prefix={<DesktopOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="运行中"
              value={runningInstances}
              prefix={<PlayCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已停止"
              value={stoppedInstances}
              prefix={<PauseCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="在线用户"
              value={1}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="快速开始" style={{ marginBottom: '24px' }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Title level={4}>1. 创建新的开发实例</Title>
            <Paragraph>
              点击"创建实例"按钮，配置您的VS Code开发环境
            </Paragraph>
          </div>
          <div>
            <Title level={4}>2. 配置实例参数</Title>
            <Paragraph>
              设置CPU、内存、存储等资源配置，选择合适的开发模板
            </Paragraph>
          </div>
          <div>
            <Title level={4}>3. 启动协同开发</Title>
            <Paragraph>
              邀请团队成员加入，开始多人协同编程
            </Paragraph>
          </div>
        </Space>
      </Card>

      <Card title="系统信息">
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Paragraph>
              <strong>版本:</strong> 3.0.0
            </Paragraph>
            <Paragraph>
              <strong>架构:</strong> 微服务
            </Paragraph>
          </Col>
          <Col span={12}>
            <Paragraph>
              <strong>前端框架:</strong> React 18 + Vite
            </Paragraph>
            <Paragraph>
              <strong>UI组件:</strong> Ant Design 5
            </Paragraph>
          </Col>
        </Row>
      </Card>

      {/* 状态管理测试组件 */}
      <StateTest />
    </div>
  );
};

export default Dashboard;
