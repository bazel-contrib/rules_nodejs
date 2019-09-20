// clang-format off
import('./strings.en').then(m => {
    const msg = document.createElement('div');
    msg.innerText = m.hello();
    msg.className = 'ts1';
    document.body.appendChild(msg);
});
