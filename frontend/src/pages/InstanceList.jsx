import React from 'react';
import { Typography, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import InstanceListComponent from '../components/InstanceList';

const { Title } = Typography;

const InstanceListPage = () => {
  const navigate = useNavigate();

  const handleCreateInstance = () => {
    navigate('/create');
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <Title level={2} style={{ margin: 0 }}>实例列表</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreateInstance}
        >
          创建实例
        </Button>
      </div>

      <InstanceListComponent />
    </div>
  );
};

export default InstanceListPage;
