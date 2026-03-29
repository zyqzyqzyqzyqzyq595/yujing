<template>
  <div class="view-page">
    <h2 class="page-title">风险闭环管理</h2>

    <div class="sys-card table-card">
      <div class="table-header">
        <h3>实时工单状态</h3>
        <button class="add-btn">+ 新建风险工单</button>
      </div>
      <table class="sys-table">
        <thead>
          <tr>
            <th>工单编号</th><th>关联预警点</th><th>风险描述</th><th>当前状态</th><th>责任人</th><th>创建时间</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>WO-2026-001</td><td>北边坡 GNSS-03</td><td>表面位移超标</td><td class="status-process">处置中</td><td>王大力</td><td>09:15:30</td>
          </tr>
          <tr>
            <td>WO-2026-002</td><td>排水口 Water-01</td><td>水位计故障</td><td class="status-done">已完成</td><td>李晓萌</td><td>08:00:22</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.page-title { margin-bottom: 20px; color: #1c3d90; }
.table-card { padding: 0; overflow: hidden; }
.table-header { padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; }
.add-btn { background: #1c3d90; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;}
.sys-table { width: 100%; border-collapse: collapse; font-size: 13px;}
.sys-table th, .sys-table td { text-align: left; padding: 12px 20px; border-bottom: 1px solid #eee;}
.sys-table thead { background: #F8FBFF;}
.status-process { color: #f39c12; font-weight: bold;}
.status-done { color: var(--warn-green); }
</style>