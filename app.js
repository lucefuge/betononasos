const groups = [
  { id: 'boom', title: 'Стреловые', description: 'Для фундаментов и перекрытий, подачи через препятствия.', photo: 'dsc07367-300x200.jpg' },
  { id: 'line', title: 'Линейные', description: 'Для подачи по трубам вглубь участка или внутрь здания.', photo: 'photo_2026-05-14_14-56-23-300x225.jpg' },
  { id: 'fixed', title: 'Стационарные', description: 'Для протяжённых трасс и длительных работ на объекте.', photo: '58f1f475258d5d1bf01c46f6ed5f9f93-300x200.jpg' }
];
const fleet = [
  ...[[16,28500],[20,32500],[24,35500],[28,36500],[32,38500],[36,41500],[42,44500],
    [46,48500],[52,54500],[56,58500],[62,68500],[65,73500],[68,78500]]
    .map(([reach, rate]) => ({ id: 'boom-' + reach, group: 'boom', name: 'Стреловой · ' + reach + ' м', reach, rate })),
  { id: 'line-cifa', group: 'line', name: 'Линейный Cifa PC 506/309', rate: 24000, horizontal: 200, vertical: 100, capacity: 50 },
  { id: 'line-bsa', group: 'line', name: 'Линейный Putzmeister BSA 1005D', rate: 26000 },
  { id: 'line-city', group: 'line', name: 'Линейный CityPump', rate: 26000 },
  { id: 'fixed-cifa', group: 'fixed', name: 'Стационарный Cifa 506', rate: 14000, horizontal: 100, vertical: 50, capacity: 40 },
  { id: 'fixed-907', group: 'fixed', name: 'Стационарный Cifa 907/612', rate: 16000, horizontal: 200, vertical: 100, capacity: 70 },
  { id: 'fixed-schwing', group: 'fixed', name: 'Стационарный Schwing SP 1800 D', rate: 19500 },
  { id: 'fixed-bsa', group: 'fixed', name: 'Стационарный Putzmeister BSA 14000 HP-D/E', rate: 22000, horizontal: 1000, vertical: 350, capacity: 105 }
];
const rubles = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
const money = amount => rubles.format(amount);
const form = document.querySelector('#estimate');
const pump = form.elements.pump;
const result = document.querySelector('#result');
const actions = document.querySelector('#actions');
const status = document.querySelector('#copy-status');
let request = '';

for (const group of groups) {
  const models = fleet.filter(model => model.group === group.id);
  const card = document.createElement('article');
  card.innerHTML = `<img loading="lazy" src="https://probetononasos.ru/wp-content/uploads/2026/05/${group.photo}" alt=""><div class="card-body"><h3>${group.title}</h3><p>${group.description}</p><div class="card-foot"><strong>от ${money(models[0].rate)}<small>за смену</small></strong><a href="#calc">Выбрать ↗</a></div></div>`;
  card.querySelector('a').addEventListener('click', () => {
    pump.value = models[0].id;
    clearEstimate();
  });
  document.querySelector('#cards').append(card);
  const options = document.createElement('optgroup');
  options.label = group.title;
  for (const model of models) {
    options.append(new Option(model.name + ' · ' + money(model.rate), model.id));
    const row = document.querySelector('#price-rows').insertRow();
    row.insertCell().textContent = model.name;
    row.insertCell().textContent = (group.id === 'boom' ? '' : 'от ') + money(model.rate);
  }
  pump.append(options);
}

function pickPump(job, distance, height, pace) {
  // Use a conservative reach screen. Final geometry depends on the installation.
  const boom = fleet.find(model => model.group === 'boom' && model.reach - 3 >= distance + height);
  if (boom && job !== 'Пол внутри здания' && pace <= 60) return boom;
  return fleet.find(model =>
    model.horizontal >= distance && model.vertical >= height && model.capacity >= pace &&
    (model.group === 'line' || model.id === 'fixed-bsa')
  );
}

function clearEstimate() {
  result.textContent = 'Нажмите «Рассчитать стоимость», чтобы обновить смету.';
  actions.hidden = true;
  status.textContent = '';
}

form.addEventListener('input', clearEstimate);
form.elements.address.addEventListener('input', () => form.elements.address.setCustomValidity(''));
form.addEventListener('submit', event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const address = data.address.trim();
  if (!address) {
    form.elements.address.setCustomValidity('Укажите адрес или ориентир.');
    form.elements.address.reportValidity();
    return;
  }
  const distance = Number(data.distance);
  const height = Number(data.height);
  const pace = Number(data.pace);
  const model = fleet.find(item => item.id === data.pump) ?? pickPump(data.job, distance, height, pace);
  const hours = Number(data.volume) / Math.min(pace, model?.capacity ?? pace);
  const shifts = Math.ceil(hours / 7);
  const rental = model ? model.rate * shifts : null;
  const delivery = data.delivery === '' ? null : Number(data.delivery);
  const total = rental === null ? 'По запросу' : 'от ' + money(rental + (delivery ?? 0));
  const needsCheck = model && (model.reach ? model.reach - 3 < distance + height :
    distance > model.horizontal || height > model.vertical);

  result.innerHTML = `<strong class="total">${total}</strong>
    <p>${model?.name ?? 'Подбор менеджером'}</p>
    <dl><div><dt>Работа по указанному темпу</dt><dd>${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(hours)} ч</dd></div>
    <div><dt>Расчётных смен по 7 ч работы</dt><dd>${shifts}</dd></div>
    <div><dt>Аренда по прайсу</dt><dd>${rental === null ? 'Уточнить' : money(rental)}</dd></div>
    <div><dt>Подача техники</dt><dd>${delivery === null ? 'По адресу' : money(delivery)}</dd></div></dl>
    <p class="site-address"></p>
    <p class="note">${needsCheck ? 'Указанные размеры выходят за пределы предварительного подбора этой модели. ' : ''}Ориентир по сменам. Менеджер подтвердит подбор, наличие, минимальный срок и доплаты за оснащение. Бетон в смету не входит.</p>`;
  result.querySelector('.site-address').textContent = 'Объект: ' + address;
  request = [
    'Запрос на аренду бетононасоса', 'Задача: ' + data.job, 'Объём: ' + data.volume + ' м³',
    'Темп приёмки: ' + data.pace + ' м³/ч', 'Расстояние / высота: ' + distance + ' / ' + height + ' м',
    'Адрес: ' + address, 'Дата и время по Москве: ' + (data.date ? data.date + ' ' + data.time : 'согласуем'),
    'Техника: ' + (model?.name ?? 'подбор менеджером'), 'Расчётных смен: ' + shifts,
    'Подача: ' + (delivery === null ? 'уточнить по адресу' : money(delivery)), 'Ориентир: ' + total,
    data.notes.trim() ? 'Условия подъезда: ' + data.notes.trim() : ''
  ].filter(Boolean).join('\n');
  document.querySelector('#email').href = 'mailto:probetononasos@yandex.ru?subject=' +
    encodeURIComponent('Расчёт подачи бетона') + '&body=' + encodeURIComponent(request);
  actions.hidden = false;
  status.textContent = '';
});

document.querySelector('#copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(request);
    status.textContent = 'Заявка скопирована.';
  } catch {
    status.textContent = 'Копирование недоступно. Воспользуйтесь кнопкой «Открыть письмо».';
  }
});
