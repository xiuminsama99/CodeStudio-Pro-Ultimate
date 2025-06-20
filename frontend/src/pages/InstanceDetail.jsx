import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import InstanceDetailComponent from '../components/InstanceDetail';

const { Title } = Typography;

const InstanceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/instances');
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '24px 24px 0 24px'
      }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={handleBack}
          style={{ marginRight: '16px' }}
        >
          返回
        </Button>
        <Title level={2} style={{ margin: 0 }}>实例详情</Title>
      </div>

      <InstanceDetailComponent
        instanceId={id}
        onBack={handleBack}
      />
    </div>
  );
};

export default InstanceDetailPage;
