<execution>
  <constraint>
    ## 自适应学习系统技术约束
    - **稳定性边界**：参数调整幅度不能超过±20%，避免系统不稳定
    - **学习速率限制**：单次调整幅度不超过学习率设定值
    - **性能监控频率**：最小监控间隔为1分钟，避免过度频繁调整
    - **内存使用限制**：配置历史和性能数据不能超过系统内存的10%
    - **回滚时间窗口**：配置变更后必须有30秒的观察期才能再次调整
    - **并发安全性**：配置更新必须是原子操作，避免并发冲突
  </constraint>

  <rule>
    ## 自适应学习强制规则
    - **性能下降保护**：任何导致性能下降超过5%的配置变更必须立即回滚
    - **用户反馈优先**：用户明确的负面反馈必须触发配置审查和调整
    - **渐进式调整原则**：所有参数调整必须是渐进式的，不允许跳跃式变更
    - **配置变更记录**：每次配置变更都必须记录到长期记忆中
    - **基线配置保护**：baseline-config.md文件只读，不允许运行时修改
    - **异常情况回滚**：系统异常或错误率超过阈值时必须自动回滚
  </rule>

  <guideline>
    ## 自适应学习指导原则
    - **数据驱动决策**：所有配置调整都基于客观的性能数据和用户反馈
    - **保守优化策略**：优先保证系统稳定性，其次考虑性能提升
    - **用户体验优先**：优化目标以用户满意度为最高优先级
    - **透明化调整**：重要的配置变更应该对用户可见并可解释
    - **持续监控**：建立完善的监控体系，及时发现和处理问题
  </guideline>

  <process>
    ## 自适应学习执行流程

    ### 🔄 实时性能监控循环
    ```mermaid
    flowchart TD
      A[启动监控] --> B[收集性能数据]
      B --> C[分析性能指标]
      C --> D{性能是否达标?}
      D -->|是| E[继续监控]
      D -->|否| F[触发优化流程]
      F --> G[生成优化建议]
      G --> H[执行配置调整]
      H --> I[验证调整效果]
      I --> J{效果是否改善?}
      J -->|是| K[记录成功经验]
      J -->|否| L[回滚配置]
      K --> E
      L --> E
      E --> B
    ```

    **性能监控实现**：
    ```
    PERFORMANCE_MONITORING_LOOP() {
        while (system_running) {
            // 1. 收集性能数据
            performance_data = collect_performance_metrics()
            
            // 2. 分析性能趋势
            trend_analysis = analyze_performance_trend(performance_data)
            
            // 3. 检查是否需要优化
            if (requires_optimization(performance_data, trend_analysis)) {
                optimization_result = trigger_optimization(performance_data)
                log_optimization_attempt(optimization_result)
            }
            
            // 4. 等待下一个监控周期
            sleep(monitoring_interval)
        }
    }
    ```

    ### 🎯 智能参数优化流程
    ```mermaid
    flowchart TD
      A[识别优化目标] --> B[分析当前配置]
      B --> C[计算优化方向]
      C --> D[生成候选配置]
      D --> E[评估配置风险]
      E --> F{风险可接受?}
      F -->|否| G[调整优化幅度]
      G --> D
      F -->|是| H[应用新配置]
      H --> I[监控配置效果]
      I --> J[记录优化结果]
    ```

    **参数优化实现**：
    ```
    INTELLIGENT_PARAMETER_OPTIMIZATION(performance_data) {
        // 1. 识别需要优化的参数
        target_parameters = identify_optimization_targets(performance_data)
        
        // 2. 计算优化方向和幅度
        for each parameter in target_parameters {
            current_value = get_current_value(parameter)
            optimization_direction = calculate_optimization_direction(parameter, performance_data)
            adjustment_magnitude = calculate_adjustment_magnitude(parameter, learning_rate)
            
            // 3. 生成新的参数值
            new_value = current_value + (optimization_direction * adjustment_magnitude)
            new_value = clamp_to_bounds(new_value, parameter.min_value, parameter.max_value)
            
            // 4. 验证调整的安全性
            if (is_safe_adjustment(current_value, new_value, parameter)) {
                candidate_config[parameter] = new_value
            }
        }
        
        // 5. 应用配置并监控效果
        return apply_and_monitor_config(candidate_config)
    }
    ```

    ### 🧠 学习经验积累流程
    ```mermaid
    flowchart TD
      A[配置变更执行] --> B[效果观察期]
      B --> C[收集反馈数据]
      C --> D[分析变更效果]
      D --> E{效果评估}
      E -->|成功| F[强化成功模式]
      E -->|失败| G[分析失败原因]
      E -->|中性| H[记录中性结果]
      F --> I[更新学习模型]
      G --> I
      H --> I
      I --> J[存储到长期记忆]
    ```

    **学习经验积累实现**：
    ```
    ACCUMULATE_LEARNING_EXPERIENCE(config_change, effect_data) {
        // 1. 分析配置变更的效果
        effect_analysis = analyze_config_change_effect(config_change, effect_data)
        
        // 2. 提取学习经验
        learning_experience = {
            change_type: config_change.type,
            change_magnitude: config_change.magnitude,
            context: config_change.context,
            effect: effect_analysis.effect,
            success_score: effect_analysis.success_score,
            user_feedback: effect_data.user_feedback,
            performance_impact: effect_analysis.performance_impact
        }
        
        // 3. 更新学习模型
        update_learning_model(learning_experience)
        
        // 4. 存储到长期记忆
        remember_optimization_experience(learning_experience)
        
        // 5. 调整学习参数
        if (learning_experience.success_score > 0.8) {
            increase_confidence_in_similar_changes()
        } else if (learning_experience.success_score < 0.3) {
            decrease_confidence_in_similar_changes()
        }
    }
    ```

    ### 🔄 配置回滚与恢复流程
    ```mermaid
    flowchart TD
      A[检测性能下降] --> B[分析下降原因]
      B --> C{是否配置相关?}
      C -->|是| D[查找最近配置变更]
      C -->|否| E[其他问题处理]
      D --> F[评估回滚必要性]
      F --> G{需要回滚?}
      G -->|是| H[执行配置回滚]
      G -->|否| I[尝试其他优化]
      H --> J[验证回滚效果]
      J --> K[记录回滚经验]
    ```

    **配置回滚实现**：
    ```
    CONFIGURATION_ROLLBACK_PROCESS(performance_degradation) {
        // 1. 分析性能下降的原因
        degradation_analysis = analyze_performance_degradation(performance_degradation)
        
        // 2. 检查是否与最近的配置变更相关
        recent_changes = get_recent_config_changes(time_window=300) // 5分钟内
        
        for each change in recent_changes {
            correlation = calculate_correlation(change, degradation_analysis)
            if (correlation > correlation_threshold) {
                // 3. 执行回滚
                rollback_result = rollback_config_change(change)
                
                // 4. 验证回滚效果
                post_rollback_performance = monitor_performance(duration=60) // 1分钟
                
                if (post_rollback_performance.improved) {
                    // 5. 记录回滚成功经验
                    remember_rollback_success(change, degradation_analysis, rollback_result)
                    return ROLLBACK_SUCCESS
                }
            }
        }
        
        return ROLLBACK_NOT_NEEDED
    }
    ```

    ### 🏭 出厂设置恢复流程
    ```mermaid
    flowchart TD
      A[接收恢复命令] --> B[确认恢复范围]
      B --> C[备份当前配置]
      C --> D[加载基线配置]
      D --> E[应用基线设置]
      E --> F[清理学习历史]
      F --> G[重新初始化系统]
      G --> H[验证恢复效果]
      H --> I[记录恢复操作]
    ```

    **出厂设置恢复实现**：
    ```
    FACTORY_RESET_PROCESS(reset_scope) {
        try {
            // 1. 备份当前配置
            current_config_backup = backup_current_config()
            
            // 2. 加载基线配置
            baseline_config = load_baseline_config()
            
            // 3. 根据恢复范围应用设置
            switch (reset_scope) {
                case FULL_RESET:
                    apply_full_baseline_config(baseline_config)
                    clear_all_learning_history()
                    break
                case PARTIAL_RESET:
                    apply_selective_baseline_config(baseline_config, reset_scope.parameters)
                    preserve_learning_history()
                    break
                case PRESERVE_OPTIMIZATIONS:
                    apply_baseline_with_optimizations(baseline_config, current_config_backup)
                    break
            }
            
            // 4. 重新初始化系统
            reinitialize_adaptive_learning_system()
            
            // 5. 记录恢复操作
            remember_factory_reset(reset_scope, current_config_backup)
            
            return FACTORY_RESET_SUCCESS
            
        } catch (Exception e) {
            // 恢复失败时的应急处理
            emergency_config_recovery(current_config_backup)
            return FACTORY_RESET_FAILED
        }
    }
    ```

    ### 📊 性能评估与报告流程
    ```
    PERFORMANCE_EVALUATION_AND_REPORTING() {
        // 1. 收集综合性能数据
        performance_metrics = {
            response_time: calculate_average_response_time(),
            user_satisfaction: calculate_user_satisfaction_score(),
            success_rate: calculate_task_success_rate(),
            resource_usage: calculate_resource_utilization(),
            optimization_effectiveness: calculate_optimization_effectiveness()
        }
        
        // 2. 生成性能报告
        performance_report = generate_performance_report(performance_metrics)
        
        // 3. 识别改进机会
        improvement_opportunities = identify_improvement_opportunities(performance_metrics)
        
        // 4. 生成优化建议
        optimization_recommendations = generate_optimization_recommendations(improvement_opportunities)
        
        // 5. 存储报告到记忆系统
        remember_performance_report(performance_report, optimization_recommendations)
        
        return {performance_report, optimization_recommendations}
    }
    ```
  </process>

  <criteria>
    ## 自适应学习质量标准

    ### 学习效果评估
    - ✅ 配置优化后性能指标有明显改善
    - ✅ 用户满意度持续提升或保持高水平
    - ✅ 系统稳定性没有受到负面影响
    - ✅ 学习经验能够有效指导后续优化

    ### 系统稳定性保证
    - ✅ 配置变更不会导致系统崩溃或异常
    - ✅ 性能下降时能够及时检测和回滚
    - ✅ 学习过程不会消耗过多系统资源
    - ✅ 并发访问时配置更新的一致性

    ### 用户体验优化
    - ✅ 配置调整对用户透明，不影响正常使用
    - ✅ 重要变更有适当的通知和解释
    - ✅ 用户可以查看和理解系统的优化过程
    - ✅ 提供简单易用的配置管理界面

    ### 记忆系统集成
    - ✅ 配置变更历史完整记录到长期记忆
    - ✅ 优化经验能够有效检索和应用
    - ✅ 记忆数据结构化良好，便于分析
    - ✅ 记忆系统与配置系统无缝集成
  </criteria>
</execution>
