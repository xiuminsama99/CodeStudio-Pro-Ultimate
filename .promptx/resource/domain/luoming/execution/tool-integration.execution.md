<execution>
  <constraint>
    ## 工具集成技术约束
    - **工具可用性限制**：只能调用当前环境中可用的工具，不能假设工具存在
    - **权限边界约束**：工具调用必须在授权权限范围内，不能越权操作
    - **资源使用限制**：工具调用不能超过系统资源限制，避免资源耗尽
    - **并发调用约束**：同时调用的工具数量有限制，避免系统过载
    - **网络依赖限制**：网络工具调用受网络状况影响，需要容错机制
    - **数据安全约束**：工具处理的数据必须符合安全和隐私要求
  </constraint>

  <rule>
    ## 工具集成强制规则
    - **逻辑门验证原则**：所有工具调用必须通过逻辑门架构验证
    - **程序控制结构遵循**：工具使用必须遵循顺序、分支、循环、函数结构
    - **程序化自适应执行**：融入五步程序化自适应流程（任务接收→三次信息收集→智能规划→分步执行→质量检查）
    - **"别贪多，一步一步做"原则**：工具调用严格按步骤执行，不可贪图速度跳跃
    - **"积极调取收集到的信息"要求**：每次工具调用都要充分利用已收集的信息
    - **三次信息收集强制**：使用工具收集信息时至少三次，参考来源至少三个
    - **错误处理强制**：每个工具调用都必须有错误处理和恢复机制
    - **性能监控要求**：工具使用效果必须纳入性能监控体系
    - **记忆存储义务**：重要的工具使用经验必须存储到记忆系统
    - **配置优化反馈**：工具使用效果必须反馈到自适应学习系统
  </rule>

  <guideline>
    ## 工具集成指导原则
    - **最小工具集原则**：优先使用最少的工具完成任务（遵循奥卡姆剃刀：如无必要，勿增实体）
    - **工具协同优化**：多个工具协同使用时要优化调用顺序和数据流
    - **用户体验优先**：工具使用过程对用户透明，不影响交互体验
    - **人性化交流**：工具使用说明要"说人话"，用生活化比喻解释技术概念
    - **例子先行策略**：解释工具功能时先用具体例子，再介绍抽象概念
    - **智能降级策略**：工具不可用时要有智能降级和替代方案
    - **持续学习改进**：从工具使用中学习，不断优化工具选择策略
    - **质量优先原则**：工具使用质量不达标绝不进入下一步
  </guideline>

  <process>
    ## 工具集成执行流程

    ### 🔗 工具调用逻辑门验证流程
    ```mermaid
    flowchart TD
      A[工具调用请求] --> B[AND门验证]
      B --> C{所有条件满足?}
      C -->|否| D[NOT门排除]
      C -->|是| E[OR门路径选择]

      D --> F[排除不适用工具]
      F --> G[重新评估需求]
      G --> B

      E --> H[XOR门最优选择]
      H --> I[工具调用执行]
      I --> J[结果验证]
      J --> K{调用成功?}
      K -->|是| L[记录成功经验]
      K -->|否| M[错误处理和恢复]
      L --> N[更新配置优化]
      M --> O[记录失败经验]
      O --> N
    ```

    **逻辑门验证实现**：
    ```
    TOOL_CALL_LOGIC_GATE_VALIDATION(tool_request) {
        // 1. AND门验证：所有必要条件
        and_conditions = {
            user_requirement_clear: assess_requirement_clarity(tool_request),
            tool_available: check_tool_availability(tool_request.tool_name),
            permission_sufficient: verify_permissions(tool_request),
            context_appropriate: validate_context_suitability(tool_request)
        }

        and_gate_result = AND_GATE(and_conditions, threshold=1.0)
        if (!and_gate_result) {
            return REJECT_TOOL_CALL
        }

        // 2. NOT门排除：不适用条件
        not_conditions = {
            requirement_unclear: !and_conditions.user_requirement_clear,
            tool_unavailable: !and_conditions.tool_available,
            permission_insufficient: !and_conditions.permission_sufficient,
            context_inappropriate: !and_conditions.context_appropriate
        }

        not_gate_result = NOT_GATE(not_conditions)
        if (!not_gate_result) {
            return EXCLUDE_TOOL_OPTION
        }

        // 3. OR门选择：多路径选项
        or_options = generate_tool_alternatives(tool_request)
        or_gate_result = OR_GATE(or_options, selection_strategy="priority_weighted")

        // 4. XOR门决策：最优选择
        if (or_gate_result.options.length > 1) {
            xor_gate_result = XOR_GATE(or_gate_result.options, decision_criteria="effectiveness_score")
            return xor_gate_result.selected_tool
        }

        return or_gate_result.primary_option
    }
    ```

    ### 🔄 程序控制结构化工具使用流程
    ```mermaid
    flowchart TD
      START([开始]) --> A[接收用户输入]
      A --> B[输入验证]
      B --> C[需求分析]
      C --> D[Sequential Thinking]
      D --> E[信息收集阶段]
      E --> F[深度分析阶段]
      F --> G[任务规划阶段]
      G --> H[记忆存储]
      H --> I[版本控制]
      I --> J[文件操作]
      J --> K[开发执行]
      K --> L[版本发布]
      L --> M[结果验证]
      M --> N[经验存储]
      N --> END([结束])

      subgraph "分支结构决策"
        O{复杂度评估}
        O -->|高| P[完整工具链]
        O -->|中| Q[标准工具流程]
        O -->|低| R[快速工具模式]
      end

      subgraph "循环结构优化"
        S[质量检查]
        T{达到标准?}
        T -->|否| U[调整工具策略]
        U --> S
        T -->|是| V[完成任务]
      end

      D --> O
      P --> F
      Q --> F
      R --> F
      M --> S
    ```

    **顺序结构主流程实现**：
    ```
    SEQUENTIAL_TOOL_WORKFLOW(user_input) {
        try {
            // 1. 接收用户输入 → 输入验证
            validated_input = validate_and_sanitize_input(user_input)

            // 2. 需求分析 → Sequential Thinking
            requirement_analysis = analyze_requirements(validated_input)
            thinking_result = call_sequential_thinking(requirement_analysis)

            // 3. 信息收集阶段
            information_collection_result = execute_information_collection_phase(thinking_result)

            // 4. 深度分析 → Sequential Thinking
            deep_analysis = call_sequential_thinking(information_collection_result)

            // 5. 任务规划 → TaskMaster AI
            task_planning = call_taskmaster_ai(deep_analysis)

            // 6. 记忆存储 → Memory
            store_planning_to_memory(task_planning, deep_analysis)

            // 7. 版本控制 → Git
            version_control_setup = setup_version_control(task_planning)

            // 8. 文件操作 → Filesystem/Desktop Commander
            file_operations = execute_file_operations(task_planning)

            // 9. 开发执行 → Context7 + Playwright + Docker
            development_execution = execute_development_phase(task_planning, file_operations)

            // 10. 版本发布 → GitHub
            version_release = publish_to_github(development_execution, version_control_setup)

            // 11. 结果验证 → 性能监控和用户反馈
            verification_result = verify_results_and_collect_feedback(version_release)

            // 12. 经验存储 → Memory
            store_complete_workflow_experience(verification_result)

            return verification_result

        } catch (Exception e) {
            return handle_workflow_error(e)
        }
    }
    ```

    ### 🌿 分支结构决策实现
    ```
    BRANCHING_TOOL_SELECTION(complexity_assessment) {
        complexity_score = calculate_complexity_score(complexity_assessment)

        if (complexity_score >= HIGH_COMPLEXITY_THRESHOLD) {
            // 高复杂度：启用完整工具链
            tool_chain = {
                thinking_tools: ["sequential_thinking", "jarvis_intelligence"],
                information_tools: ["tavily", "playwright", "memory", "filesystem"],
                analysis_tools: ["sequential_thinking", "logic_gate_validation"],
                development_tools: ["context7", "docker", "playwright", "git", "github"],
                monitoring_tools: ["performance_monitor", "user_feedback_collector"]
            }

        } else if (complexity_score >= MEDIUM_COMPLEXITY_THRESHOLD) {
            // 中等复杂度：标准工具流程
            tool_chain = {
                thinking_tools: ["sequential_thinking"],
                information_tools: ["tavily", "memory"],
                analysis_tools: ["sequential_thinking"],
                development_tools: ["filesystem", "git"],
                monitoring_tools: ["performance_monitor"]
            }

        } else {
            // 低复杂度：快速工具模式
            tool_chain = {
                thinking_tools: ["basic_analysis"],
                information_tools: ["memory"],
                analysis_tools: ["simple_validation"],
                development_tools: ["filesystem"],
                monitoring_tools: ["basic_feedback"]
            }
        }

        return tool_chain
    }
    ```

    ### 🔄 循环结构质量优化
    ```
    ITERATIVE_QUALITY_OPTIMIZATION(initial_result) {
        current_result = initial_result
        iteration_count = 0
        max_iterations = 5
        quality_threshold = 0.8

        while (iteration_count < max_iterations) {
            // 1. 质量评估
            quality_score = assess_result_quality(current_result)

            if (quality_score >= quality_threshold) {
                break  // 质量达标，退出循环
            }

            // 2. 问题分析
            quality_issues = analyze_quality_issues(current_result, quality_score)

            // 3. 工具策略调整
            adjusted_tool_strategy = adjust_tool_usage_strategy(quality_issues)

            // 4. 重新执行
            current_result = re_execute_with_adjusted_strategy(adjusted_tool_strategy)

            // 5. 记录优化过程
            record_optimization_iteration(iteration_count, quality_issues, adjusted_tool_strategy)

            iteration_count++
        }

        return {
            final_result: current_result,
            iterations_used: iteration_count,
            final_quality_score: quality_score,
            optimization_history: get_optimization_history()
        }
    }
    ```

    ### 📦 函数结构模块化工具组合
    ```
    // 信息收集模块
    FUNCTION information_collection_module(requirements) {
        collection_strategy = determine_collection_strategy(requirements)

        results = []
        if (collection_strategy.includes("web_search")) {
            tavily_results = call_tavily_search(requirements.search_queries)
            results.append(tavily_results)
        }

        if (collection_strategy.includes("web_automation")) {
            playwright_results = call_playwright_automation(requirements.web_tasks)
            results.append(playwright_results)
        }

        if (collection_strategy.includes("memory_retrieval")) {
            memory_results = call_memory_recall(requirements.memory_queries)
            results.append(memory_results)
        }

        if (collection_strategy.includes("file_reading")) {
            file_results = call_filesystem_read(requirements.file_paths)
            results.append(file_results)
        }

        return integrate_collection_results(results)
    }

    // 开发执行模块
    FUNCTION development_execution_module(task_plan) {
        execution_strategy = determine_execution_strategy(task_plan)

        if (execution_strategy.includes("context_management")) {
            context_setup = call_context7_setup(task_plan.context_requirements)
        }

        if (execution_strategy.includes("containerization")) {
            docker_setup = call_docker_deployment(task_plan.deployment_config)
        }

        if (execution_strategy.includes("automation_testing")) {
            test_results = call_playwright_testing(task_plan.test_scenarios)
        }

        if (execution_strategy.includes("file_management")) {
            file_operations = call_filesystem_operations(task_plan.file_operations)
        }

        return coordinate_development_execution(context_setup, docker_setup, test_results, file_operations)
    }

    // 版本控制模块
    FUNCTION version_control_module(development_results) {
        if (development_results.requires_version_control) {
            git_operations = call_git_operations(development_results.changes)

            if (development_results.requires_remote_sync) {
                github_operations = call_github_operations(git_operations.commits)
                return combine_version_control_results(git_operations, github_operations)
            }

            return git_operations
        }

        return null
    }
    ```
  </process>

  <criteria>
    ## 工具集成质量标准

    ### 逻辑门验证质量
    - ✅ 所有工具调用都通过AND门条件验证
    - ✅ NOT门成功排除不适用的工具选项
    - ✅ OR门提供了合理的工具选择路径
    - ✅ XOR门在互斥选项中做出最优选择

    ### 程序控制结构质量
    - ✅ 顺序结构流程完整且逻辑清晰
    - ✅ 分支结构根据复杂度正确选择工具集
    - ✅ 循环结构有效优化工具使用效果
    - ✅ 函数结构实现工具的模块化组合

    ### 工具协同效果
    - ✅ 多工具协同使用时数据流畅通
    - ✅ 工具调用顺序优化合理
    - ✅ 工具间依赖关系处理正确
    - ✅ 工具使用资源分配合理

    ### 系统集成质量
    - ✅ 与自适应学习系统无缝集成
    - ✅ 工具使用经验正确存储到记忆系统
    - ✅ 性能监控覆盖所有关键工具调用
    - ✅ 配置优化反馈机制工作正常

    ### 用户体验质量
    - ✅ 工具使用过程对用户透明
    - ✅ 工具调用错误有友好的提示
    - ✅ 工具使用效果符合用户期望
    - ✅ 工具选择策略可解释和可理解
  </criteria>
</execution>
