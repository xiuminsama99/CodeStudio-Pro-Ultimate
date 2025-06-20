import React from 'react';
import { Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import CreateInstanceForm from '../components/CreateInstanceForm';

const { Title } = Typography;

const CreateInstancePage = () => {
  const navigate = useNavigate();

  const handleSuccess = (instance) => {
    message.success(`实例 ${instance.name} 创建成功！`);
    // 跳转到实例详情页
    navigate(`/instances/${instance.id}`);
  };

  const handleCancel = () => {
    navigate('/instances');
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ textAlign: 'center', marginBottom: 32 }}>
        创建实例
      </Title>

      <CreateInstanceForm
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default CreateInstancePage;
