# 重构说明 封装

本章介绍了**封装**相关的进阶重构手法，这些手法主要用于隐藏数据结构细节、分离职责、降低耦合，是设计更健壮模块的重要工具。

---

## 目录
1. [封装记录](#71-封装记录encapsulate-record)
2. [封装集合](#72-封装集合encapsulate-collection)
3. [以对象取代基本类型](#73-以对象取代基本类型replace-primitive-with-object)
4. [以查询取代临时变量](#74-以查询取代临时变量replace-temp-with-query)
5. [提炼类](#75-提炼类extract-class)
6. [内联类](#76-内联类inline-class)
7. [隐藏委托关系](#77-隐藏委托关系hide-delegate)
8. [移除中间人](#78-移除中间人remove-middle-man)
9. [替换算法](#79-替换算法substitute-algorithm)

---

## 7.1 封装记录（Encapsulate Record）

**曾用名**：以数据类取代记录（Replace Record with Data Class）

### 核心思想
将普通的记录/字典/对象结构用类包装起来，控制对其的访问。

### 动机
- 记录型结构直观但不完美，无法隐藏存储细节
- 类可以通过方法提供计算字段（比如区间的 start/end/length），用户无需关心实际存储
- 方便渐进式修改字段名，不用一次性修改所有调用点
- 嵌套结构（如JSON）封装后更容易应对结构变化

### 做法
1. 先对记录变量使用**封装变量**
2. 创建类包装记录，定义访问原始记录的方法
3. 逐步将每个字段的访问替换为类的访问方法
4. 最后移除对原始记录的直接访问

### 示例
```javascript
// 封装前
let organization = { name: "Acme Gooseberries", country: "GB" };

// 封装后
class Organization {
  constructor(data) {
    this._name = data.name;
    this._country = data.country;
  }
  get name() { return this._name; }
  set name(arg) { this._name = arg; }
  get country() { return this._country; }
  set country(arg) { this._country = arg; }
}
```

> 如果数据不可变，不需要封装，可以直接使用记录。

---

## 7.2 封装集合（Encapsulate Collection）

### 核心思想
不要直接返回集合本身，通过添加/移除方法控制修改，返回只读副本防止意外修改。

### 动机
- 如果直接返回集合，客户端可以在类不知情的情况下修改集合，破坏封装
- 所有修改都必须经过类，方便监控变化、添加验证逻辑
- 避免因意外修改产生难以调试的bug

### 做法
1. 如果集合未封装，先用封装变量封装
2. 在类上添加添加元素和移除元素的方法
3. 移除集合的设值函数（或让它返回副本）
4. 修改所有直接修改集合的代码，改用添加/移除方法
5. 修改取值函数，让它返回只读副本或只读代理

### 示例
```javascript
// 封装前
class Person {
  get courses() {return this._courses;}
  set courses(aList) {this._courses = aList;}
}

// 封装后
class Person {
  get courses() {return this._courses.slice();} // 返回副本
  addCourse(aCourse) { this._courses.push(aCourse); }
  removeCourse(aCourse) { 
    const index = this._courses.indexOf(aCourse);
    this._courses.splice(index, 1);
  }
}
```

> 建议在项目中统一做法：所有集合封装都返回副本，避免意外修改。

---

## 7.3 以对象取代基本类型（Replace Primitive with Object）

**曾用名**：以对象取代数据值（Replace Data Value with Object）、以类取代类型码（Replace Type Code with Class）

### 核心思想
如果对基本类型数据的操作超出了简单存取，就把它包装成类。

### 动机
- 一开始用字符串/数字表示简单概念，后来需要额外行为或验证，基本类型就不够用了
- 把相关行为和数据集中在一起，减少重复代码
- 这些小类会慢慢成长为有用的组件，对代码库影响深远

### 做法
1. 如果变量未封装，先使用封装变量
2. 创建一个简单的值类，构造函数接收原始值，提供取值方法
3. 修改访问函数，令其使用新对象
4. 根据需要添加行为

### 示例
```javascript
// 替换前
highPriorityCount = orders.filter(o => 
  "high" === o.priority || "rush" === o.priority
).length;

// 替换后
class Priority {
  constructor(value) {
    if (Priority.legalValues().includes(value))
      this._value = value;
    else
      throw new Error(`<${value}> is invalid for Priority`);
  }
  equals(other) {return this._index === other._index;}
  higherThan(other) {return this._index > other._index;}
  static legalValues() {return ['low', 'normal', 'high', 'rush'];}
}

highPriorityCount = orders.filter(o => 
  o.priority.higherThan(new Priority("normal"))
).length;
```

---

## 7.4 以查询取代临时变量（Replace Temp with Query）

### 核心思想
将计算临时变量的表达式提炼成独立查询函数，消除临时变量。

### 动机
- 分解长函数时，不需要把临时变量作为参数传递给提炼出的小函数
- 避免重复计算相同逻辑，多个地方都可以使用这个查询
- 在类中有天然的上下文，适合使用该手法

### 适用条件
- 变量只计算一次且之后不再修改
- 计算逻辑没有副作用

### 做法
1. 确保变量只被赋值一次，改为只读
2. 测试
3. 将赋值表达式提炼成函数
4. 内联变量，消除临时变量
5. 测试

### 示例
```javascript
// 替换前
get price() {
  const basePrice = this._quantity * this._itemPrice;
  var discountFactor = 0.98;
  if (basePrice > 1000) discountFactor -= 0.03;
  return basePrice * discountFactor;
}

// 替换后
get price() {
  return this.basePrice * this.discountFactor;
}
get basePrice() {
  return this._quantity * this._itemPrice;
}
get discountFactor() {
  var discountFactor = 0.98;
  if (this.basePrice > 1000) discountFactor -= 0.03;
  return discountFactor;
}
```

---

## 7.5 提炼类（Extract Class）

**反向重构**：内联类（186）

### 核心思想
一个类承担了太多责任，把一部分责任提炼到新类中。

### 动机
- 单一职责原则：一个类只应该有一个修改原因
- 类不断成长会变得过于复杂，难以理解
- 如果某些数据和函数总是一起变化，它们应该一起提炼出去
- 如果发现子类化只影响部分特性，说明应该拆分

### 做法
1. 决定如何拆分责任
2. 创建新类，分离出责任
3. 建立旧类到新类的连接
4. 逐步搬移字段和函数，每次搬移后测试
5. 调整两个类的接口，决定是否公开新类

### 示例
```javascript
// 提炼前
class Person {
  get officeAreaCode() {return this._officeAreaCode;}
  get officeNumber()   {return this._officeNumber;}
}

// 提炼后
class Person {
  get officeAreaCode() {return this._telephoneNumber.areaCode;}
  get officeNumber()   {return this._telephoneNumber.number;}
}
class TelephoneNumber {
  get areaCode() {return this._areaCode;}
  get number()   {return this._number;}
}
```

---

## 7.6 内联类（Inline Class）

**反向重构**：提炼类（182）

### 核心思想
如果一个类不再承担足够责任，把它合并到另一个类中。

### 动机
- 类被拆分后，经过几次修改，原类已经萎缩得没有存在必要
- 想重新组织两个类的职责，可以先内联再重新提炼

### 做法
1. 在目标类创建源类所有公有方法
2. 将所有调用点改为调用目标类方法，每次修改后测试
3. 逐步搬移所有函数和数据到目标类，直到源类为空
4. 删除源类

### 示例
```javascript
// 内联前
class Person {
  get officeAreaCode() {return this._telephoneNumber.areaCode;}
  get officeNumber()  {return this._telephoneNumber.number;}
}
class TelephoneNumber {
  get areaCode() {return this._areaCode;}
  get number() {return this._number;}
}

// 内联后
class Person {
  get officeAreaCode() {return this._officeAreaCode;}
  get officeNumber()  {return this._officeNumber;}
}
```

---

## 7.7 隐藏委托关系（Hide Delegate）

**反向重构**：移除中间人（192）

### 核心思想
客户端通过A对象访问B对象（委托），让A提供一个方法隐藏这个委托关系，客户端不需要知道B。

### 动机
- 封装：减少客户端对内部结构的了解，降低耦合
- 如果委托关系变化，只需要修改A，不需要修改所有客户端
- 模块化设计中，每个模块应该尽可能少了解其他部分

### 做法
1. 为委托类的每个方法在服务类创建委托方法
2. 修改客户端，让它只调用服务类的方法
3. 如果没有客户端再访问委托类，可以移除服务类中获取委托的访问方法

### 示例
```javascript
// 隐藏前
manager = aPerson.department.manager;

// 隐藏后
manager = aPerson.manager;

class Person {
  get manager() {return this.department.manager;}
}
```

---

## 7.8 移除中间人（Remove Middle Man）

**反向重构**：隐藏委托关系（189）

### 核心思想
如果服务类太多方法都只是简单委托给委托类，服务类变成了无用的中间人，就让客户端直接调用委托类。

### 动机
- 隐藏委托的代价是，每添加一个新方法都要在服务类加一个转发，变得繁琐
- 过度遵循迪米特法则可能导致很多无用中间人
- 重构是不断调整的，现在不合适的封装可以改回来

### 做法
1. 为委托对象添加取值函数
2. 将每个委托方法的调用改为客户端直接访问委托
3. 删除服务类中的委托方法
4. 测试

### 示例
```javascript
// 移除前
manager = aPerson.manager;

class Person {
  get manager() {return this.department.manager;}
}

// 移除后
manager = aPerson.department.manager;
```

> 不必追求完美，可以部分隐藏、部分直接访问，看哪种更方便。

---

## 7.9 替换算法（Substitute Algorithm）

### 核心思想
用更清晰简洁的算法替换原来复杂的算法。

### 动机
- 对问题理解加深后，会发现更简单的解决方案
- 使用第三方库提供的功能替换自己手写的代码
- 想要改变算法做不同的事，先替换成更容易修改的版本

### 做法
1. 把原算法提炼成独立函数
2. 准备好新算法
3. 测试对比新旧算法结果
4. 如果结果一致，替换完成；否则以旧算法为参照调试新算法

### 示例
```javascript
// 替换前
function foundPerson(people) {
  for(let i = 0; i < people.length; i++) {
    if (people[i] === "Don") return "Don";
    if (people[i] === "John") return "John";
    if (people[i] === "Kent") return "Kent";
  }
  return "";
}

// 替换后
function foundPerson(people) {
  const candidates = ["Don", "John", "Kent"];
  return people.find(p => candidates.includes(p)) || '';
}
```

---

## 本章总结 - 封装重构要点

| 重构手法 | 适用场景 | 好处 |
|---------|---------|------|
| 封装记录 | 使用记录/字典存储数据 | 隐藏实现细节，方便修改 |
| 封装集合 | 类直接返回集合给客户端 | 控制集合修改，防止意外破坏 |
| 以对象取代基本类型 | 基本类型需要额外行为或验证 | 将行为和数据集中在一起，更表达力 |
| 以查询取代临时变量 | 函数内有多个临时变量保存计算结果 | 消除临时变量，方便提炼函数 |
| 提炼类 | 一个类承担太多责任 | 单一职责，每个类只做一件事 |
| 内联类 | 类萎缩不再需要存在 | 合并职责，消除多余抽象 |
| 隐藏委托关系 | 客户端需要访问服务对象内部的对象 | 降低耦合，封装内部结构 |
| 移除中间人 | 太多简单委托，服务类变成中间人 | 消除不必要的间接层 |
| 替换算法 | 现有算法复杂或可以更简单 | 拥抱更清晰的解决方案 |

### 封装的核心思想
- **信息隐藏**：模块应该隐藏它的实现细节，只暴露必要的接口
- **降低耦合**：让客户端依赖更少的内部组件，变化更容易应对
- **渐进调整**：不是一开始就要设计完美封装，可以随着理解加深不断调整
- **适度原则**：过度封装和封装不足都不好，重构手法可以帮你来回调整找到最合适的度

> 封装是模块化设计的基石，熟练运用这些手法，就能设计出更容易理解、更容易修改的代码结构。