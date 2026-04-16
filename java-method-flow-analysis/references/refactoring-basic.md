# 重构说明 基础重构手法

本章介绍了重构入门的第一组基础重构手法，这些是最常用、最基础的重构操作，适合作为重构入门练习。

---

## 目录
1. [提炼函数](#61-提炼函数extract-function)
2. [内联函数](#62-内联函数inline-function)
3. [提炼变量](#63-提炼变量extract-variable)
4. [内联变量](#64-内联变量inline-variable)
5. [改变函数声明](#65-改变函数声明change-function-declaration)
6. [封装变量](#66-封装变量encapsulate-variable)
7. [变量改名](#67-变量改名rename-variable)
8. [引入参数对象](#68-引入参数对象introduce-parameter-object)
9. [函数组合成类](#69-函数组合成类combine-functions-into-class)
10. [函数组合成变换](#610-函数组合成变换combine-functions-into-transform)
11. [拆分阶段](#611-拆分阶段split-phase)

---

## 6.1 提炼函数（Extract Function）

**曾用名**：提炼函数（Extract Method）  
**反向重构**：内联函数（115）

### 核心思想
将一段代码提取出来，封装成一个独立函数，并用代码的用途为函数命名。

### 动机
- **分离意图与实现**：让读者一眼看出函数做了什么，而不用看它怎么做
- **小函数更易读**：即使只有几行代码，只要命名清晰就值得提炼
- **减少重复**：相同逻辑可以复用
- **性能影响可以忽略**：现代编译器对小函数优化更好

### 做法
1. 创建新函数，根据函数意图命名（以"做什么"命名，不是"怎么做"）
2. 将待提炼代码复制到新函数
3. 检查并处理作用域问题，将需要访问的变量作为参数传入
4. 编译检查
5. 在原函数中用调用新函数代替被提炼代码
6. 测试
7. 查找重复代码，统一调用新函数

### 示例
```javascript
// 提炼前
function printOwing(invoice) {
  printBanner();
  let outstanding = calculateOutstanding();

  //print details
  console.log(`name: ${invoice.customer}`);
  console.log(`amount: ${outstanding}`);
}

// 提炼后
function printOwing(invoice) {
  printBanner();
  let outstanding = calculateOutstanding();
  printDetails(outstanding);

  function printDetails(outstanding) {
    console.log(`name: ${invoice.customer}`);
    console.log(`amount: ${outstanding}`);
  }
}
```

---

## 6.2 内联函数（Inline Function）

**反向重构**：提炼函数（106）

### 核心思想
如果函数内部代码和函数名一样清晰，就直接把函数代码内联到调用处，去掉间接层。

### 动机
- 移除不必要的间接层，让代码更直接
- 多个函数组织不合理时，先全部内联再重新提炼
- 消除过多委托造成的阅读困难

### 做法
1. 检查函数不具多态性
2. 找出所有调用点
3. 将每个调用点替换为函数本体
4. 每次替换后测试
5. 删除原函数定义

### 示例
```javascript
// 内联前
function getRating(driver) {
  return moreThanFiveLateDeliveries(driver) ? 2 : 1;
}
function moreThanFiveLateDeliveries(driver) {
  return driver.numberOfLateDeliveries > 5;
}

// 内联后
function getRating(driver) {
  return (driver.numberOfLateDeliveries > 5) ? 2 : 1;
}
```

---

## 6.3 提炼变量（Extract Variable）

**曾用名**：引入解释性变量（Introduce Explaining Variable）  
**反向重构**：内联变量（123）

### 核心思想
给复杂表达式中的一部分起个清晰的名字，分解复杂逻辑。

### 动机
- 让复杂表达式更容易阅读理解
- 给表达式的一部分命名，说明其意图
- 方便调试和断点

### 做法
1. 确认要提炼的表达式没有副作用
2. 声明一个不可修改的变量，复制表达式结果赋值给它
3. 用新变量替换原表达式
4. 测试
5. 如果表达式出现多次，逐一替换

### 示例
```javascript
// 提炼前
return (
  order.quantity * order.itemPrice -
  Math.max(0, order.quantity - 500) * order.itemPrice * 0.05 +
  Math.min(order.quantity * order.itemPrice * 0.1, 100)
);

// 提炼后
const basePrice = order.quantity * order.itemPrice;
const quantityDiscount = 
  Math.max(0, order.quantity - 500) * order.itemPrice * 0.05;
const shipping = Math.min(basePrice * 0.1, 100);
return basePrice - quantityDiscount + shipping;
```

> 如果这个变量在更大范围（如整个类）也有意义，建议改成**提炼函数**。

---

## 6.4 内联变量（Inline Variable）

**曾用名**：内联临时变量（Inline Temp）  
**反向重构**：提炼变量（119）

### 核心思想
如果变量名不比表达式本身更清晰，就直接用表达式替换变量引用。

### 动机
- 移除不必要的变量，简化代码
- 变量会妨碍重构附近代码

### 做法
1. 确认赋值表达式无副作用
2. 将变量改为不可修改，测试（确保只赋值一次）
3. 将第一个使用点替换为表达式
4. 测试
5. 替换所有使用点
6. 删除变量声明和赋值
7. 测试

### 示例
```javascript
// 内联前
let basePrice = anOrder.basePrice;
return (basePrice > 1000);

// 内联后
return anOrder.basePrice > 1000;
```

---

## 6.5 改变函数声明（Change Function Declaration）

**别名**：函数改名（Rename Function）、修改签名（Change Signature）

### 核心思想
随着理解加深，不断调整函数的名字和参数列表，让代码更清晰。

### 动机
- 好名字能一眼看出函数用途
- 参数列表决定了函数如何与外部交互，去除不必要的耦合
- 帮助函数适应更广的使用场景

### 两种做法
1. **简单做法**：一步到位修改所有调用点，适合调用点少的情况
2. **迁移式做法**：通过提炼+内联逐步修改，适合大量调用或公共API的情况

#### 迁移式做法步骤
1. 如果需要，先重构函数体方便提炼
2. 提炼出一个新函数，使用新的声明
3. 旧函数内联调用新函数，每次修改一个调用点
4. 最后删除旧函数

### 示例 - 函数改名
```javascript
// 改名前
function circum(radius) {
  return 2 * Math.PI * radius;
}

// 改名后
function circumference(radius) {
  return 2 * Math.PI * radius;
}
```

---

## 6.6 封装变量（Encapsulate Variable）

**曾用名**：封装字段（Encapsulate Field）

### 核心思想
对于可变数据，所有访问都必须通过函数，限制直接访问。

### 动机
- 数据比函数难重构，封装后可以把数据修改转化为函数修改，难度降低
- 可以监控数据变化，添加验证逻辑
- 防止全局数据到处被修改，难以追踪
- 不可变数据不需要封装，不变性是最好的防腐剂

### 做法
1. 创建读写两个封装函数
2. 静态检查
3. 逐一修改访问代码为调用封装函数，每次修改后测试
4. 限制原变量可见性
5. 测试

### 示例
```javascript
// 封装前
let defaultOwner = { firstName: "Martin", lastName: "Fowler" };

// 封装后
let defaultOwnerData = { firstName: "Martin", lastName: "Fowler" };
export function defaultOwner() {
  return defaultOwnerData;
}
export function setDefaultOwner(arg) {
  defaultOwnerData = arg;
}
```

---

## 6.7 变量改名（Rename Variable）

### 核心思想
好的变量名能清晰表达其用途，发现更好的名字就赶紧改。

### 动机
- 随着理解加深，需要更准确的命名
- 清晰命名减少注释，提高可读性

### 做法
1. 如果变量被广泛引用，先使用封装变量
2. 修改所有引用点
3. 测试

---

## 6.8 引入参数对象（Introduce Parameter Object）

### 核心思想
将经常一起出现的一组参数封装成一个对象。

### 动机
- 参数太多不好记，调用麻烦
- 多个函数都使用这组参数，减少重复传递
- 代码更清晰，参数列表更简洁

### 示例
```javascript
// 引入前
function amountInvoiced(startDate, endDate) { ... }
function amountReceived(startDate, endDate) { ... }
function amountOverdue(startDate, endDate) { ... }

// 引入后
function amountInvoiced(dateRange) { ... }
function amountReceived(dateRange) { ... }
function amountOverdue(dateRange) { ... }
// 其中 dateRange 是包含 start 和 end 的对象
```

---

## 6.9 函数组合成类（Combine Functions into Class）

### 核心思想
如果一组函数共同操作一块数据，把它们组合成一个类。

### 动机
- 函数和数据放在一起，更符合面向对象思想
- 减少参数传递，因为所有函数都可以访问类内部数据
- 代码更内聚，结构更清晰

### 示例：计算消费
多个函数都需要操作相同的订单数据，将它们组合成一个类：
```javascript
// 组合前
function calculateBasePrice(orders) { ... }
function calculateTax(orders) { ... }
function calculateDiscount(orders) { ... }

// 组合后
class OrderCalculator {
  constructor(orders) {
    this.orders = orders;
  }
  calculateBasePrice() { ... }
  calculateTax() { ... }
  calculateDiscount() { ... }
  calculateTotal() { ... }
}
```

---

## 6.10 函数组合成变换（Combine Functions into Transform）

### 核心思想
将一系列对同一数据的处理函数，组合成一个变换管道。

### 动机
- 处理只读数据特别方便
- 每个变换步骤都是独立函数，易于理解和测试
- 适合数据流处理模式

### 示例
```javascript
// 组合前
const result = calculateDiscount(calculateTax(addShipping(validateOrder(order))));

// 组合后
const orderTransform = [
  validateOrder,
  addShipping, 
  calculateTax,
  calculateDiscount
];
const result = orderTransform.reduce(
  (data, fn) => fn(data), 
  order
);
```

---

## 6.11 拆分阶段（Split Phase）

### 核心思想
如果一段代码做了两件不同的事情，把它们拆分成两个独立阶段。

### 动机
- 单一职责原则，每个阶段只做一件事
- 不同阶段逻辑可以独立演化
- 降低复杂度，更容易理解和维护

### 常见场景
1. **解析**和**处理**：先把输入解析为数据结构，再处理数据
2. **转换**和**输出**：先转换数据格式，再输出
3. 不同领域逻辑分开

---

## 本章总结 - 初级重构要点

| 重构手法 | 适用场景 | 好处 |
|---------|---------|------|
| 提炼函数 | 代码段需要注释说明用途 | 分离意图和实现，提高复用 |
| 内联函数 | 函数间接层不必要 | 简化代码，移除多余间接 |
| 提炼变量 | 复杂表达式需要分解 | 提高可读性，命名子表达式 |
| 内联变量 | 变量名不增加价值 | 简化代码 |
| 改变函数声明 | 函数名字不对，参数需要调整 | 让函数声明更清晰表达意图 |
| 封装变量 | 可变数据作用域超出单个函数 | 控制访问，简化后续重构 |
| 变量改名 | 变量名字不清晰 | 提高可读性 |
| 引入参数对象 | 一组参数经常一起出现 | 减少参数数量，统一传递 |
| 函数组合成类 | 多个函数共同操作同一数据 | 内聚，减少参数传递 |
| 函数组合成变换 | 一系列数据转换操作 | 清晰，每个步骤独立 |
| 拆分阶段 | 一段代码做多件不同事情 | 单一职责，降低复杂度 |

### 核心原则
- **小步前进，频繁测试**：每次小修改后测试，比一次改很多更容易定位问题
- **好命名比长度重要**：哪怕函数只有一行，好名字比长函数更有价值
- **随时重构**：随着理解加深，不断调整代码结构，不要害怕修改
- **先提炼再重构**：复杂修改分解为多个简单步骤，通过提炼和内联逐步完成

> 这些基础重构手法是所有更复杂重构的基础，熟练掌握它们，就能开始安全地改善代码设计了。