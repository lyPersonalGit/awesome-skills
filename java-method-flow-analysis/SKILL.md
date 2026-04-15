---
name: java-method-flow-analysis
description: 梳理Java任意类方法的完整业务调用堆栈和流程分析，生成包含调用堆栈、体系结构、Mermaid时序图的分析文档。当用户要求分析Java方法的完整调用流程、梳理业务逻辑、生成分析文档时触发。同时可提供重构建议，按表格形式整理提炼函数、提炼变量、重命名等重构建议。
compatibility: Java, Spring Boot, 多模块项目，需要读取源码
metadata:
  pattern: pipeline
  subpatterns: [generator, reviewer]
  steps: "4"
---

你运行的是 Java 方法业务流程分析 Pipeline。梳理Java任意类方法的完整业务调用堆栈，分析设计模式和体系结构，生成包含调用堆栈、体系结构、Mermaid时序图的分析文档。还可以提供重构建议，整理代码改善点。**执行每个步骤依次进行，禁止跳过步骤。**

## 触发场景

当用户说：
- "梳理这个方法的完整调用流程"
- "分析这个controller方法的业务逻辑"
- "分析这个service方法的调用链"
- "帮我生成方法调用堆栈和时序图"
- "参照文档分析这两个类中的方法，得到完整调用堆栈"
- "生成XX业务分析文档放在根目录"
- "补充重构建议，表格形式整理提炼函数/提炼变量"

这些场景都应该触发这个skill。

## Step 1 — 信息收集与确认
**DO NOT PROCEED TO STEP 2 UNTIL ALL INFORMATION IS CONFIRMED**

1. **确定入口文件和方法**：询问用户需要分析哪些文件，哪些方法
   - 入口可以是**任意类中的任意方法**：
     - 常见入口：`Controller.method()` / `Service.method()` / `Handler.method()`
     - 支持普通业务类、工具类、DAO等任意类型作为入口
   - 用户需要提供文件路径

2. **读取源码**：使用 `read` 工具读取相关Java源文件

3. **梳理调用关系**：从入口方法开始，逐层梳理调用关系，识别：
   - 遇到其他类的方法调用，需要理解这个方法的作用
   - 识别出分支逻辑（if-else，循环等）
   - 识别出设计模式（模板方法、策略模式等）

4. **向用户确认**：列出你梳理出的所有文件和调用入口，确认是否完整。

## Step 2 — 分析完成确认

梳理完所有调用关系和分支逻辑后，向用户确认：
- "我已梳理出完整调用关系，是否开始生成分析文档？"

**DO NOT PROCEED TO STEP 3 UNTIL USER CONFIRMS.**

## Step 3 — 生成分析文档

### 3.1 加载模板
Load `references/example-output.md` for the required output structure and section order. **Every section in the template must be preserved in the output, even if empty.**

### 3.2 核心输出模块（必须全部包含）

按照以下顺序输出：

1. **入口方法概述** - 
   - 如果入口是Controller方法：展示接口路径、请求方法、功能描述、请求参数
   - 如果入口是普通方法：展示方法签名、功能描述、输入参数
2. **完整调用堆栈** - 树形结构展示从入口到最深层完整调用链
3. **时序图** - *（Mermaid 格式）* 使用sequenceDiagram展示多参与者交互流程
4. **体系结构分析** - 如果使用了设计模式（模板方法、策略等），画出类层次结构
5. **关键业务流程说明** - 特殊业务规则（如重复处理防护、异步通知、缓存策略），可附上项目源代码中对应关键部分帮助理解
6. **状态码定义** - 使用**一个表格**，三列结构整理所有状态码及其含义：`字段 | 值 | 含义`（仅当接口有返回状态码时展示）。同一个字段有多个值时，字段列只在第一行展示，后续行留空不重复填写。
7. **异常处理机制** - 各个方法如何处理异常，具体到方法级别说明
8. **重构建议** - 对照重构检查清单给出重构建议

### 3.2.1 时序图生成规则
生成时序图时注意参与者粒度和去重：
- 以**类**为单位作为参与者，不要为每个方法都拆分独立参与者
- 工具类的方法调用归属于原类，不需要将工具类单独拆分为参与者
- 同一个类中的多个方法调用，都使用该类作为同一个参与者，不需要拆分
- **相同含义的参与者必须合并**：如数据库 与 Database / MySQL 是同一含义，RPC服务 与 Dubbo 是同一含义，不能重复拆分多个参与者
- 时序图关注的是对象之间的交互流程，而非方法调用栈，所以按类划分即可，这一点与调用堆栈不同

正确示例：
````markdown
```mermaid
sequenceDiagram
    participant Caller as 调用方
    participant Ctrl as OrderController
    participant Service as OrderService
    participant DB as 数据库
    # 不需要把 OrderService 中的每个方法再拆分参与者
    # 数据库/DB/MySQL 只保留一个参与者即可
```
````

### 3.3 可选模块（根据代码实际情况选择添加）

- **设计模式分析** - 如果代码中使用了设计模式，需要：
  1. 分析使用了什么设计模式，为什么这么设计
  2. 使用 **Mermaid classDiagram** 输出UML类图展示关系
- 版本变更历史 - 如果有多个版本变更，整理变更内容
- 数据库表说明 - 如果涉及数据库操作，说明操作哪些表
- 配置项说明 - 如果需要读取配置，说明配置项含义

### 3.4 输出格式规范

1. **文档存放位置**：用户一般要求放在项目根目录，文档命名格式 `[版本号]功能业务分析.md` 或 `[功能名]业务流程分析.md`

2. **调用堆栈格式**：使用 ASCII 树形字符：
   ```
   Controller.method()
   ├─ 1. 第一步操作
   ├─ 2. 第二步操作
   │  └─ 调用 service.method()
   │     ├─ 分支判断 A
   │     └─ 分支判断 B
   └─ 3. 第三步操作
   ```

3. **类层次结构格式**：使用通用 ASCII 树形结构，适配任意类关系：
   ```
   根节点名称 [类型标注]
   ├─ 父类/接口1
   │  ├─ 成员A
   │  └─ 成员B
   ├─ 父类/接口2
   └─ 具体实现类
      ├─ 实现类1 → 业务类型1
      ├─ 实现类2 → 业务类型2
      └─ 实现类3 → 业务类型3
   ```
   类型标注可根据实际情况填写：`[抽象类]` / `[接口]` / `[枚举]` / `[实现类]` 等

4. **设计模式 UML 类图**：必须使用标准 Mermaid classDiagram 格式：
````
```mermaid
classDiagram
    AbstractRoot <|-- ConcreteClass1
    AbstractRoot <|-- ConcreteClass2
    AbstractRoot : +abstractMethod1()
    AbstractRoot : +commonMethod()
    ConcreteClass1 : +implementMethod1()
    ConcreteClass2 : +implementMethod2()
```
````

5. **时序图**：必须使用标准 Mermaid 格式：
````
```mermaid
sequenceDiagram
    participant A as 参与者A
    participant B as 参与者B
    A->>B: 消息描述
...
```
````

## Step 4 — 重构建议

1. **加载检查清单**：加载 `references/checklist.md` 获取完整的重构检查清单。

2. **分析代码**：对照检查清单中的每一项分析代码。

 3. **输出格式**：使用以下表格格式：

 | 序号 | 重构类型 | 位置 | 问题描述 | 重构建议 | 优先级 |
 |------|----------|------|------|----------|------|
 | 1 | **提炼函数** | `ClassName.methodName()` 行 `N~M` | 问题描述 | 提炼为 `functionName()`，说明职责 | ⭐⭐⭐⭐⭐ (5星最高优先级必须改) |
 | 2 | **提炼变量** | `ClassName.methodName()` 行 `N` | 条件表达式太长 | 提炼为 `boolean variableName = condition;` | ⭐⭐⭐ (3星中等优先级) |

星级代表重构优先级，1星最低（可选优化），5星最高（强烈建议重构）。

## 遵循原则

1. **完整不遗漏**：梳理完整的调用链，不能只梳理到一半
2. **准确对应源码**：文档中的流程必须和源码一致，不能臆造
3. **分支清晰**：所有if-else分支、循环都要清晰展示
4. **模块化输出**：核心模块不可少，可选模块按需添加
5. **缩进正确**：树形结构缩进要正确，便于阅读
6. **去重合并**：相同含义参与者合并，不重复展示

## 示例

完整示例输出结构参见 `references/example-output.md`
