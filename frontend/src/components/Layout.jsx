import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Typography } from 'antd';
import {
  DashboardOutlined,
  DesktopOutlined,
  PlusOutlined,
  SettingOutlined
} from '@ant-design/icons';

const { Header, Sider, Content } = AntLayout;
const { Title } = Typography;

const Layout = () => {
  const [collapsed, setCollapsed] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表板',
    },
    {
      key: '/instances',
      icon: <DesktopOutlined />,
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

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  // 获取当前选中的菜单项
  const getSelectedKeys = () => {
    const pathname = location.pathname;
    if (pathname.startsWith('/instances/')) {
      return ['/instances'];
    }
    return [pathname];
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        theme="dark"
        width={256}
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
          fontWeight: 'bold',
          fontSize: collapsed ? '14px' : '16px'
        }}>
          {collapsed ? 'CS' : 'CodeStudio'}
        </div>
        <Menu
          theme="dark"
          selectedKeys={getSelectedKeys()}
          mode="inline"
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <AntLayout>
        <Header style={{ 
          padding: '0 24px', 
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0',
          boxShadow: '0 1px 4px rgba(0, 21, 41, 0.08)'
        }}>
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
            CodeStudio Pro Ultimate 3.0
          </Title>
        </Header>
        <Content style={{ 
          margin: '0', 
          background: '#f0f2f5',
          minHeight: 'calc(100vh - 64px)',
          overflow: 'auto'
        }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
