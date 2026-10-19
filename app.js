// Register the service worker so Elostora can be installed and cache its files on Android.
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
const $ = id => document.getElementById(id);
const STORAGE_KEY = 'elostora_study_hub_v1';
const fresh = { tasks: [], lectures: [] };
let state;
try { state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || fresh; } catch { state = fresh; }
state.tasks = Array.isArray(state.tasks) ? state.tasks : [];
state.lectures = Array.isArray(state.lectures) ? state.lectures : [];
state.tasks.forEach(t => { if (!Array.isArray(t.times)) t.times = t.time ? [t.time] : ['09:00','15:00','20:00']; if (!Array.isArray(t.notifiedKeys)) t.notifiedKeys=[]; if (typeof t.planned !== 'boolean') t.planned=false; });
let currentFilter = 'all', currentLectureFilter = 'all';
const today = new Date();
const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
const dateString = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
$('todayLabel').textContent = today.toLocaleDateString('ar-EG',{weekday:'long',day:'numeric',month:'long'});
$('tomorrowLabel').textContent = tomorrow.toLocaleDateString('ar-EG',{weekday:'long',day:'numeric',month:'long'});
$('lectureDate').value = dateString(today); $('taskDue').value = dateString(tomorrow);
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600);}
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(e){toast('تعذر الحفظ في المتصفح');}render();}
function showView(name){document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));const target=$(name+'View');if(target)target.classList.remove('hidden');document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.view===name));}
document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.goto)));
function makeId(){return (crypto&&crypto.randomUUID)?crypto.randomUUID():String(Date.now())+Math.random().toString(16).slice(2);}
function getTimes(selector){return [...document.querySelectorAll(selector)].map(x=>x.value).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).sort();}
function resetTimes(selector){['09:00','15:00','20:00'].forEach((v,i)=>{const el=document.querySelectorAll(selector)[i];if(el)el.value=v;});}
$('lectureForm').addEventListener('submit',e=>{e.preventDefault();const subject=$('subjectName').value.trim(),title=$('lectureTitle').value.trim();if(!subject||!title)return;state.lectures.push({id:makeId(),subject,type:$('lectureType').value,title,date:$('lectureDate').value||dateString(today),status:'لسه'});e.target.reset();$('lectureDate').value=dateString(today);save();showView('subjects');toast('اتضافت للمادة بنجاح');});
$('taskForm').addEventListener('submit',e=>{e.preventDefault();const title=$('taskTitle').value.trim();if(!title)return;state.tasks.push({id:makeId(),title,subject:$('taskSubject').value.trim(),due:$('taskDue').value||dateString(tomorrow),priority:$('taskPriority').value,times:getTimes('.taskReminderTime'),done:false,planned:false,notifiedKeys:[]});e.target.reset();$('taskDue').value=dateString(tomorrow);resetTimes('.taskReminderTime');save();toast('اتضافت المهمة');});

$('notifyBtn').addEventListener('click', async () => {
  if (!window.isSecureContext) {
    toast('افتح الموقع من رابط HTTPS الرسمي');
    return;
  }

  if (!('Notification' in window)) {
    toast('المتصفح لا يدعم الإشعارات');
    return;
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      toast('الإشعارات غير مسموح بها: ' + permission);
      return;
    }

    if (!('serviceWorker' in navigator)) {
      toast('المتصفح لا يدعم Service Worker');
      return;
    }

    const registration = await navigator.serviceWorker.ready;

    if (!registration.active) {
      toast('خدمة الإشعارات لم تبدأ. حدّث الصفحة وجرب تاني');
      return;
    }

    await registration.showNotification('Elostora — اختبار إشعار', {
      body: 'تمام! الإشعارات اتفعّلت على الجهاز.',
      icon: './icon-192.png',
      tag: 'elostora-test',
      vibrate: [200, 100, 200]
    });

    toast('تم إرسال الإشعار التجريبي');
  } catch (error) {
    console.error('Elostora notification error:', error);
    toast('خطأ في الإشعارات: ' + (error.message || error.name || 'خطأ غير معروف'));
  }
});

function toggleTask(id){const t=state.tasks.find(x=>x.id===id);if(t){t.done=!t.done;save();}}
function togglePlan(id){const t=state.tasks.find(x=>x.id===id);if(t){t.planned=!t.planned;if(t.planned)t.due=dateString(tomorrow);save();toast(t.planned?'اتضافت لخطة بكرة':'اتشالت من خطة بكرة');}}
function deleteTask(id){state.tasks=state.tasks.filter(x=>x.id!==id);save();toast('اتحذفت المهمة');}
function taskHTML(t,planButton=true){return `<div class="task-item ${t.done?'done':''}"><input class="task-check" type="checkbox" ${t.done?'checked':''} aria-label="تمت المهمة" data-done="${t.id}"><div class="task-main"><div class="task-name">${esc(t.title)}</div><div class="meta">${esc(t.subject||'بدون مادة')} · التسليم: ${esc(t.due||'مش محدد')} · التنبيهات: ${esc((t.times||[]).join('، ')||'غير محددة')}</div></div><span class="tag">${esc(t.priority||'عادية')}</span>${planButton?`<button class="icon-btn" data-plan="${t.id}">${t.planned?'إزالة من بكرة':'أضف لبكرة'}</button>`:`<button class="icon-btn" data-delete-task="${t.id}">حذف</button>`}</div>`;}
function bindTasks(root){root.querySelectorAll('[data-done]').forEach(b=>b.addEventListener('change',()=>toggleTask(b.dataset.done)));root.querySelectorAll('[data-plan]').forEach(b=>b.addEventListener('click',()=>togglePlan(b.dataset.plan)));root.querySelectorAll('[data-delete-task]').forEach(b=>b.addEventListener('click',()=>deleteTask(b.dataset.deleteTask)));}
function renderTasks(){const list=$('taskList');const items=state.tasks.filter(t=>currentFilter==='all'||(currentFilter==='open'&&!t.done)||(currentFilter==='done'&&t.done));list.innerHTML=items.length?items.map(t=>taskHTML(t,false)).join(''):'<div class="empty">لسه مفيش مهام. أضف مهمة من فوق.</div>';bindTasks(list);}
document.querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>{currentFilter=b.dataset.filter;document.querySelectorAll('.filter').forEach(x=>x.classList.toggle('active',x===b));renderTasks();}));
function renderLectures(){const items=state.lectures.filter(l=>currentLectureFilter==='all'||l.type===currentLectureFilter);const subjects={};items.forEach(l=>subjects[l.subject]=(subjects[l.subject]||0)+1);$('subjectCounts').innerHTML=Object.keys(subjects).length?Object.entries(subjects).map(([s,n])=>`<span class="subject-count">${esc(s)} <b>${n}</b></span>`).join(''):'<div class="empty">لسه مفيش مواد مضافة.</div>';$('lectureList').innerHTML=items.length?items.map((l,i)=>`<div class="lecture-card"><div class="lecture-number-box">${i+1}</div><div class="task-main"><div class="task-name">${esc(l.subject)} — ${esc(l.title)}</div><div class="meta">${esc(l.type)} · ${esc(l.date||'بدون تاريخ')} · ${esc(l.status||'لسه')}</div></div><button class="status-button ${l.status==='تمام'?'':'pending'}" data-lecture-status="${l.id}">${l.status==='تمام'?'✓ تمام':'علّمها تمام'}</button><button class="icon-btn" data-lecture-delete="${l.id}">حذف</button></div>`).join(''):'<div class="empty">مفيش عناصر في القسم ده. أضف أول محاضرة من فوق.</div>'; $('lectureList').querySelectorAll('[data-lecture-status]').forEach(b=>b.addEventListener('click',()=>{const l=state.lectures.find(x=>x.id===b.dataset.lectureStatus);if(l){l.status=l.status==='تمام'?'لسه':'تمام';save();}}));$('lectureList').querySelectorAll('[data-lecture-delete]').forEach(b=>b.addEventListener('click',()=>{state.lectures=state.lectures.filter(x=>x.id!==b.dataset.lectureDelete);save();}));}
document.querySelectorAll('[data-lecture-filter]').forEach(b=>b.addEventListener('click',()=>{currentLectureFilter=b.dataset.lectureFilter;document.querySelectorAll('[data-lecture-filter]').forEach(x=>x.classList.toggle('active',x===b));renderLectures();}));
function renderTomorrow(){const planned=state.tasks.filter(t=>t.planned&&!t.done);$('dashboardTomorrow').innerHTML=planned.length?planned.map(t=>taskHTML(t,false)).join(''):'<div class="empty">مفيش حاجة مختارة لبكرة لسه. افتح خطة بكرة واختار مهامك.</div>';bindTasks($('dashboardTomorrow'));const open=state.tasks.filter(t=>!t.done);$('tomorrowEditor').innerHTML=open.length?open.map(t=>taskHTML(t,true)).join(''):'<div class="empty">مفيش مهام. ضيف مهمة من بنك المهام الأول.</div>';bindTasks($('tomorrowEditor'));}
function render(){$('totalTasks').textContent=state.tasks.length;$('tomorrowTasks').textContent=state.tasks.filter(t=>t.planned&&!t.done).length;$('totalLectures').textContent=state.lectures.length;$('doneTasks').textContent=state.tasks.filter(t=>t.done).length;renderTasks();renderLectures();renderTomorrow();}
// This timer works only while the page is open. Closed-page notifications require a push server/service.
function checkNotices(){if(!('Notification' in window)||Notification.permission!=='granted')return;const now=new Date(),day=dateString(now),hm=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;let changed=false;state.tasks.forEach(t=>{if(t.done)return;t.notifiedKeys=t.notifiedKeys||[];if(t.due===day&&(t.times||[]).includes(hm)){const key=`${day} ${hm} ${t.id}`;if(!t.notifiedKeys.includes(key)){try{new Notification('Elostora — وقت المذاكرة',{body:`متنساش: ${t.title}${t.subject?' · '+t.subject:''}`});t.notifiedKeys.push(key);changed=true;}catch(e){}}}});if(changed){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(e){}}}
render();checkNotices();setInterval(checkNotices,10000);
