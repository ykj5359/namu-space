// 결제 모듈 — SITE.payment.provider / clientKey 에 따라 실제 결제창 또는 모의 결제로 동작
//  · 'toss' + clientKey 있음 : 토스페이먼츠 결제창(카드·계좌이체·가상계좌) 호출 → successUrl 로 돌아오면 서버에서 승인(confirm) 필요
//  · clientKey 없음          : 모의 결제 — 주문번호를 만들고 주문서를 저장한 뒤 완료 페이지로 이동 (무통장입금 안내)
// 실제 결제를 켜려면 README 의 "결제 연동" 항목을 참고하세요.
(function () {
  const ORDERS = 'nw_orders';
  const loadOrders = () => { try { return JSON.parse(localStorage.getItem(ORDERS)) || []; } catch (e) { return []; } };
  const saveOrder = o => { const a = loadOrders(); a.unshift(o); try { localStorage.setItem(ORDERS, JSON.stringify(a.slice(0, 20))); } catch (e) {} };
  const orderNo = () => { const d = new Date(); return `NW${d.getFullYear().toString().slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`; };

  async function loadToss() {
    if (window.TossPayments) return window.TossPayments;
    await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://js.tosspayments.com/v1/payment'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    return window.TossPayments;
  }

  // order: { no, items, customer, totals, method, memo }
  async function pay(order) {
    const cfg = SITE.payment || {};
    order.no = order.no || orderNo(); order.createdAt = new Date().toISOString(); order.status = 'pending';
    saveOrder(order);
    if (cfg.provider === 'toss' && cfg.clientKey) {
      const Toss = await loadToss(); const toss = Toss(cfg.clientKey);
      const methodMap = { card: '카드', transfer: '계좌이체', vbank: '가상계좌' };
      const base = location.href.replace(/[^/]*$/, '');
      await toss.requestPayment(methodMap[order.method] || '카드', {
        amount: order.totals.total, orderId: order.no,
        orderName: order.items.length > 1 ? `${NW_CART.label(order.items[0])} 외 ${order.items.length - 1}건` : NW_CART.label(order.items[0]),
        customerName: order.customer.name, customerEmail: order.customer.email, customerMobilePhone: (order.customer.tel || '').replace(/-/g, ''),
        successUrl: base + (cfg.successUrl || 'complete.html') + '?order=' + order.no, failUrl: base + (cfg.failUrl || 'checkout.html') + '?fail=1&order=' + order.no,
      });
      return; // 결제창으로 이동 (성공 시 successUrl 로 돌아옴)
    }
    // 모의 결제: 바로 접수 처리
    order.status = order.method === 'vbank' || order.method === 'bank' ? 'awaiting_deposit' : 'simulated';
    saveOrder(order);
    location.href = 'complete.html?order=' + order.no;
  }
  window.NW_PAY = { pay, orders: loadOrders, orderNo, setStatus(no, status, extra) { const a = loadOrders(); const o = a.find(x => x.no === no); if (o) { o.status = status; Object.assign(o, extra || {}); try { localStorage.setItem(ORDERS, JSON.stringify(a)); } catch (e) {} } return o; } };
})();
