1.open ```ion-datetime_3-ios.entry.js``` and ```ion-datetime_3-md.entry.js```
2.modify update function:
  ```
  update(y, duration, saveY) {
        if (!this.optsEl) {
            return;
        }
        // ensure we've got a good round number :)
        let translateY = 0;
        let translateZ = 0;
        const { col, rotateFactor } = this;
        const selectedIndex = col.selectedIndex = this.indexForY(-y);
        const durationStr = (duration === 0) ? '' : duration + 'ms';
        const scaleStr = `scale(${this.scaleFactor})`;
        const children = this.optsEl.children;
        const children_length = this.optsEl.children.length;
        const options_length = col.options.length;
        const length = children_length < options_length ? options_length : children_length;
        for (let i = 0; i < length; i++) {
            const button = children[i];
            const opt = col.options[i];
            const optOffset = (i * this.optHeight) + y;
            let transform = '';
            if (rotateFactor !== 0) {
                const rotateX = optOffset * rotateFactor;
                if (Math.abs(rotateX) <= 90) {
                    translateY = 0;
                    translateZ = 90;
                    transform = `rotateX(${rotateX}deg) `;
                }
                else {
                    translateY = -9999;
                }
            }
            else {
                translateZ = 0;
                translateY = optOffset;
            }
            const selected = selectedIndex === i;
            transform += `translate3d(0px,${translateY}px,${translateZ}px) `;
            if (this.scaleFactor !== 1 && !selected) {
                transform += scaleStr;
            }
            // Update transition duration
            if (this.noAnimate) {
                if (opt) {
                    opt.duration = 0;
                }
                if (button) {
                    button.style.transitionDuration = '';
                }
            }
            else if (opt) {
                if (duration !== opt.duration) {
                    opt.duration = duration;
                    if (button) {
                        button.style.transitionDuration = durationStr;
                    }
                }
            }
            // Update transform
            if (opt) {
                if (transform !== opt.transform) {
                    opt.transform = transform;
                    if (button) {
                        button.style.transform = transform;
                    }
                }
            }
            // Update selected item
            if (opt) {
                if (selected !== opt.selected) {
                    opt.selected = selected;
                    if (selected && button) {
                        button.classList.add(PICKER_OPT_SELECTED);
                    }
                    else if (button) {
                        button.classList.remove(PICKER_OPT_SELECTED);
                    }
                }
            }
        }
        this.col.prevSelected = selectedIndex;
        if (saveY) {
            this.y = y;
        }
        if (this.lastIndex !== selectedIndex) {
            // have not set a last index yet
            hapticSelectionChanged();
            this.lastIndex = selectedIndex;
        }
  }
```
3.modify render function:
  ```
  render() {
        const col = this.col;
        const Button = 'button';
        const mode = getIonMode(this);
        return (h(Host, { class: {
                [mode]: true,
                'picker-col': true,
                'picker-opts-left': this.col.align === 'left',
                'picker-opts-right': this.col.align === 'right'
            }, style: {
                'max-width': this.col.columnWidth
            } }, col.prefix && (h("div", { class: "picker-prefix", style: { width: col.prefixWidth } }, col.prefix)), h("div", { class: "picker-opts", style: { maxWidth: col.optionsWidth }, ref: el => this.optsEl = el }, col.options.map((o, index) => h(Button, { type: "button", class: { 'picker-opt': true, 'picker-opt-disabled': !!o.disabled, 'picker-opt-selected': o.selected }, style: { transform: o.transform ? o.transform : 'translate3d(0px, -9999px, 90px)', 'transition-duration': o.duration ? o.duration : TRANSITION_DURATION + 'ms' }, "opt-index": index }, o.text))), col.suffix && (h("div", { class: "picker-suffix", style: { width: col.suffixWidth } }, col.suffix))));
    }
 ```
