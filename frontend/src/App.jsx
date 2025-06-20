import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout, Menu, Typography, Space } from 'antd';
import {
  DesktopOutlined,
  PlusOutlined,
  UnorderedListOutlined,
  SettingOutlined
} from '@ant-design/icons';
import './App.css';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

// 临时组件，后续会替换为实际组件
const Dashboard = () => (
  <div style={{ padding: '24px' }}>
    <Title level={2}>CodeStudio Pro Ultimate 3.0</Title>
    <p>欢迎使用多实例VS Code协同开发系统</p>
    <Space direction="vertical" size="large">
      <div>
        <h3>系统状态</h3>
        <p>✅ 前端服务运行正常</p>
        <p>⚠️ 后端服务连接中...</p>
      </div>
      <div>
        <h3>快速开始</h3>
        <p>1. 创建新的开发实例</p>
        <p>2. 配置实例参数</p>
        <p>3. 启动协同开发</p>
      </div>
    </Space>
  </div>
);

const InstanceList = () => (
  <div style={{ padding: '24px' }}>
    <Title level={2}>实例列表</Title>
    <p>这里将显示所有VS Code实例</p>
  </div>
);

const CreateInstance = () => (
  <div style={{ padding: '24px' }}>
    <Title level={2}>创建实例</Title>
    <p>这里将显示实例创建表单</p>
  </div>
);

const Settings = () => (
  <div style={{ padding: '24px' }}>
    <Title level={2}>系统设置</Title>
    <p>这里将显示系统配置选项</p>
  </div>
);

function App() {
  const [collapsed, setCollapsed] = React.useState(false);

  const menuItems = [
    {
      key: '/',
      icon: <DesktopOutlined />,
      label: '仪表板',
    },
    {
      key: '/instances',
      icon: <UnorderedListOutlined />,
      label: '实例列表',
    },
    {
      key: '/create',
      icon: <PlusOutlined />,
      label: '创建实例',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
  ];

  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider 
          collapsible 
          collapsed={collapsed} 
          onCollapse={setCollapsed}
          theme="dark"
        >
          <div style={{ 
            height: '64px', 
            margin: '16px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold'
          }}>
            {collapsed ? 'CS' : 'CodeStudio'}
          </div>
          <Menu
            theme="dark"
            defaultSelectedKeys={['/']}
            mode="inline"
            items={menuItems}
            onClick={({ key }) => {
              window.history.pushState(null, '', key);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
          />
        </Sider>
        <Layout>
          <Header style={{ 
            padding: '0 24px', 
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #f0f0f0'
          }}>
            <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
              CodeStudio Pro Ultimate 3.0
            </Title>
          </Header>
          <Content style={{ margin: '0', background: '#f0f2f5' }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/instances" element={<InstanceList />} />
              <Route path="/create" element={<CreateInstance />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Router>
  );
}

export default App;
