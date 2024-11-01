var Desktop = (function () {
	'use strict';

	/** @returns {void} */
	function noop() {}

	/** @returns {void} */
	function add_location(element, file, line, column, char) {
		element.__svelte_meta = {
			loc: { file, line, column, char }
		};
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	/**
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function run_all(fns) {
		fns.forEach(run);
	}

	/**
	 * @param {any} thing
	 * @returns {thing is Function}
	 */
	function is_function(thing) {
		return typeof thing === 'function';
	}

	/** @returns {boolean} */
	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
	}

	let src_url_equal_anchor;

	/**
	 * @param {string} element_src
	 * @param {string} url
	 * @returns {boolean}
	 */
	function src_url_equal(element_src, url) {
		if (element_src === url) return true;
		if (!src_url_equal_anchor) {
			src_url_equal_anchor = document.createElement('a');
		}
		// This is actually faster than doing URL(..).href
		src_url_equal_anchor.href = url;
		return element_src === src_url_equal_anchor.href;
	}

	/** @returns {boolean} */
	function is_empty(obj) {
		return Object.keys(obj).length === 0;
	}

	/** @type {typeof globalThis} */
	const globals =
		typeof window !== 'undefined'
			? window
			: typeof globalThis !== 'undefined'
			? globalThis
			: // @ts-ignore Node typings have this
			  global;

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @returns {void}
	 */
	function append(target, node) {
		target.appendChild(node);
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @param {Node} [anchor]
	 * @returns {void}
	 */
	function insert(target, node, anchor) {
		target.insertBefore(node, anchor || null);
	}

	/**
	 * @param {Node} node
	 * @returns {void}
	 */
	function detach(node) {
		if (node.parentNode) {
			node.parentNode.removeChild(node);
		}
	}

	/**
	 * @returns {void} */
	function destroy_each(iterations, detaching) {
		for (let i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detaching);
		}
	}

	/**
	 * @template {keyof HTMLElementTagNameMap} K
	 * @param {K} name
	 * @returns {HTMLElementTagNameMap[K]}
	 */
	function element(name) {
		return document.createElement(name);
	}

	/**
	 * @param {string} data
	 * @returns {Text}
	 */
	function text(data) {
		return document.createTextNode(data);
	}

	/**
	 * @returns {Text} */
	function space() {
		return text(' ');
	}

	/**
	 * @param {EventTarget} node
	 * @param {string} event
	 * @param {EventListenerOrEventListenerObject} handler
	 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
	 * @returns {() => void}
	 */
	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return () => node.removeEventListener(event, handler, options);
	}

	/**
	 * @param {Element} node
	 * @param {string} attribute
	 * @param {string} [value]
	 * @returns {void}
	 */
	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
	}

	/**
	 * @param {Element} element
	 * @returns {ChildNode[]}
	 */
	function children(element) {
		return Array.from(element.childNodes);
	}

	/**
	 * @returns {void} */
	function toggle_class(element, name, toggle) {
		// The `!!` is required because an `undefined` flag means flipping the current state.
		element.classList.toggle(name, !!toggle);
	}

	/**
	 * @template T
	 * @param {string} type
	 * @param {T} [detail]
	 * @param {{ bubbles?: boolean, cancelable?: boolean }} [options]
	 * @returns {CustomEvent<T>}
	 */
	function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
		return new CustomEvent(type, { detail, bubbles, cancelable });
	}

	/**
	 * @typedef {Node & {
	 * 	claim_order?: number;
	 * 	hydrate_init?: true;
	 * 	actual_end_child?: NodeEx;
	 * 	childNodes: NodeListOf<NodeEx>;
	 * }} NodeEx
	 */

	/** @typedef {ChildNode & NodeEx} ChildNodeEx */

	/** @typedef {NodeEx & { claim_order: number }} NodeEx2 */

	/**
	 * @typedef {ChildNodeEx[] & {
	 * 	claim_info?: {
	 * 		last_index: number;
	 * 		total_claimed: number;
	 * 	};
	 * }} ChildNodeArray
	 */

	let current_component;

	/** @returns {void} */
	function set_current_component(component) {
		current_component = component;
	}

	function get_current_component() {
		if (!current_component) throw new Error('Function called outside component initialization');
		return current_component;
	}

	/**
	 * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
	 * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
	 * it can be called from an external module).
	 *
	 * If a function is returned _synchronously_ from `onMount`, it will be called when the component is unmounted.
	 *
	 * `onMount` does not run inside a [server-side component](https://svelte.dev/docs#run-time-server-side-component-api).
	 *
	 * https://svelte.dev/docs/svelte#onmount
	 * @template T
	 * @param {() => import('./private.js').NotFunction<T> | Promise<import('./private.js').NotFunction<T>> | (() => any)} fn
	 * @returns {void}
	 */
	function onMount(fn) {
		get_current_component().$$.on_mount.push(fn);
	}

	/**
	 * Creates an event dispatcher that can be used to dispatch [component events](https://svelte.dev/docs#template-syntax-component-directives-on-eventname).
	 * Event dispatchers are functions that can take two arguments: `name` and `detail`.
	 *
	 * Component events created with `createEventDispatcher` create a
	 * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
	 * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
	 * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
	 * property and can contain any type of data.
	 *
	 * The event dispatcher can be typed to narrow the allowed event names and the type of the `detail` argument:
	 * ```ts
	 * const dispatch = createEventDispatcher<{
	 *  loaded: never; // does not take a detail argument
	 *  change: string; // takes a detail argument of type string, which is required
	 *  optional: number | null; // takes an optional detail argument of type number
	 * }>();
	 * ```
	 *
	 * https://svelte.dev/docs/svelte#createeventdispatcher
	 * @template {Record<string, any>} [EventMap=any]
	 * @returns {import('./public.js').EventDispatcher<EventMap>}
	 */
	function createEventDispatcher() {
		const component = get_current_component();
		return (type, detail, { cancelable = false } = {}) => {
			const callbacks = component.$$.callbacks[type];
			if (callbacks) {
				// TODO are there situations where events could be dispatched
				// in a server (non-DOM) environment?
				const event = custom_event(/** @type {string} */ (type), detail, { cancelable });
				callbacks.slice().forEach((fn) => {
					fn.call(component, event);
				});
				return !event.defaultPrevented;
			}
			return true;
		};
	}

	// TODO figure out if we still want to support
	// shorthand events, or if we want to implement
	// a real bubbling mechanism
	/**
	 * @param component
	 * @param event
	 * @returns {void}
	 */
	function bubble(component, event) {
		const callbacks = component.$$.callbacks[event.type];
		if (callbacks) {
			// @ts-ignore
			callbacks.slice().forEach((fn) => fn.call(this, event));
		}
	}

	const dirty_components = [];
	const binding_callbacks = [];

	let render_callbacks = [];

	const flush_callbacks = [];

	const resolved_promise = /* @__PURE__ */ Promise.resolve();

	let update_scheduled = false;

	/** @returns {void} */
	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	/** @returns {void} */
	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	// flush() calls callbacks in this order:
	// 1. All beforeUpdate callbacks, in order: parents before children
	// 2. All bind:this callbacks, in reverse order: children before parents.
	// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
	//    for afterUpdates called during the initial onMount, which are called in
	//    reverse order: children before parents.
	// Since callbacks might update component values, which could trigger another
	// call to flush(), the following steps guard against this:
	// 1. During beforeUpdate, any updated components will be added to the
	//    dirty_components array and will cause a reentrant call to flush(). Because
	//    the flush index is kept outside the function, the reentrant call will pick
	//    up where the earlier call left off and go through all dirty components. The
	//    current_component value is saved and restored so that the reentrant call will
	//    not interfere with the "parent" flush() call.
	// 2. bind:this callbacks cannot trigger new flush() calls.
	// 3. During afterUpdate, any updated components will NOT have their afterUpdate
	//    callback called a second time; the seen_callbacks set, outside the flush()
	//    function, guarantees this behavior.
	const seen_callbacks = new Set();

	let flushidx = 0; // Do *not* move this inside the flush() function

	/** @returns {void} */
	function flush() {
		// Do not reenter flush while dirty components are updated, as this can
		// result in an infinite loop. Instead, let the inner flush handle it.
		// Reentrancy is ok afterwards for bindings etc.
		if (flushidx !== 0) {
			return;
		}
		const saved_component = current_component;
		do {
			// first, call beforeUpdate functions
			// and update components
			try {
				while (flushidx < dirty_components.length) {
					const component = dirty_components[flushidx];
					flushidx++;
					set_current_component(component);
					update(component.$$);
				}
			} catch (e) {
				// reset dirty state to not end up in a deadlocked state and then rethrow
				dirty_components.length = 0;
				flushidx = 0;
				throw e;
			}
			set_current_component(null);
			dirty_components.length = 0;
			flushidx = 0;
			while (binding_callbacks.length) binding_callbacks.pop()();
			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			for (let i = 0; i < render_callbacks.length; i += 1) {
				const callback = render_callbacks[i];
				if (!seen_callbacks.has(callback)) {
					// ...so guard against infinite loops
					seen_callbacks.add(callback);
					callback();
				}
			}
			render_callbacks.length = 0;
		} while (dirty_components.length);
		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}
		update_scheduled = false;
		seen_callbacks.clear();
		set_current_component(saved_component);
	}

	/** @returns {void} */
	function update($$) {
		if ($$.fragment !== null) {
			$$.update();
			run_all($$.before_update);
			const dirty = $$.dirty;
			$$.dirty = [-1];
			$$.fragment && $$.fragment.p($$.ctx, dirty);
			$$.after_update.forEach(add_render_callback);
		}
	}

	/**
	 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function flush_render_callbacks(fns) {
		const filtered = [];
		const targets = [];
		render_callbacks.forEach((c) => (fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c)));
		targets.forEach((c) => c());
		render_callbacks = filtered;
	}

	const outroing = new Set();

	/**
	 * @type {Outro}
	 */
	let outros;

	/**
	 * @returns {void} */
	function group_outros() {
		outros = {
			r: 0,
			c: [],
			p: outros // parent group
		};
	}

	/**
	 * @returns {void} */
	function check_outros() {
		if (!outros.r) {
			run_all(outros.c);
		}
		outros = outros.p;
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} [local]
	 * @returns {void}
	 */
	function transition_in(block, local) {
		if (block && block.i) {
			outroing.delete(block);
			block.i(local);
		}
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} local
	 * @param {0 | 1} [detach]
	 * @param {() => void} [callback]
	 * @returns {void}
	 */
	function transition_out(block, local, detach, callback) {
		if (block && block.o) {
			if (outroing.has(block)) return;
			outroing.add(block);
			outros.c.push(() => {
				outroing.delete(block);
				if (callback) {
					if (detach) block.d(1);
					callback();
				}
			});
			block.o(local);
		} else if (callback) {
			callback();
		}
	}

	/** @typedef {1} INTRO */
	/** @typedef {0} OUTRO */
	/** @typedef {{ direction: 'in' | 'out' | 'both' }} TransitionOptions */
	/** @typedef {(node: Element, params: any, options: TransitionOptions) => import('../transition/public.js').TransitionConfig} TransitionFn */

	/**
	 * @typedef {Object} Outro
	 * @property {number} r
	 * @property {Function[]} c
	 * @property {Object} p
	 */

	/**
	 * @typedef {Object} PendingProgram
	 * @property {number} start
	 * @property {INTRO|OUTRO} b
	 * @property {Outro} [group]
	 */

	/**
	 * @typedef {Object} Program
	 * @property {number} a
	 * @property {INTRO|OUTRO} b
	 * @property {1|-1} d
	 * @property {number} duration
	 * @property {number} start
	 * @property {number} end
	 * @property {Outro} [group]
	 */

	// general each functions:

	function ensure_array_like(array_like_or_iterator) {
		return array_like_or_iterator?.length !== undefined
			? array_like_or_iterator
			: Array.from(array_like_or_iterator);
	}

	/** @returns {void} */
	function outro_and_destroy_block(block, lookup) {
		transition_out(block, 1, 1, () => {
			lookup.delete(block.key);
		});
	}

	/** @returns {any[]} */
	function update_keyed_each(
		old_blocks,
		dirty,
		get_key,
		dynamic,
		ctx,
		list,
		lookup,
		node,
		destroy,
		create_each_block,
		next,
		get_context
	) {
		let o = old_blocks.length;
		let n = list.length;
		let i = o;
		const old_indexes = {};
		while (i--) old_indexes[old_blocks[i].key] = i;
		const new_blocks = [];
		const new_lookup = new Map();
		const deltas = new Map();
		const updates = [];
		i = n;
		while (i--) {
			const child_ctx = get_context(ctx, list, i);
			const key = get_key(child_ctx);
			let block = lookup.get(key);
			if (!block) {
				block = create_each_block(key, child_ctx);
				block.c();
			} else if (dynamic) {
				// defer updates until all the DOM shuffling is done
				updates.push(() => block.p(child_ctx, dirty));
			}
			new_lookup.set(key, (new_blocks[i] = block));
			if (key in old_indexes) deltas.set(key, Math.abs(i - old_indexes[key]));
		}
		const will_move = new Set();
		const did_move = new Set();
		/** @returns {void} */
		function insert(block) {
			transition_in(block, 1);
			block.m(node, next);
			lookup.set(block.key, block);
			next = block.first;
			n--;
		}
		while (o && n) {
			const new_block = new_blocks[n - 1];
			const old_block = old_blocks[o - 1];
			const new_key = new_block.key;
			const old_key = old_block.key;
			if (new_block === old_block) {
				// do nothing
				next = new_block.first;
				o--;
				n--;
			} else if (!new_lookup.has(old_key)) {
				// remove old block
				destroy(old_block, lookup);
				o--;
			} else if (!lookup.has(new_key) || will_move.has(new_key)) {
				insert(new_block);
			} else if (did_move.has(old_key)) {
				o--;
			} else if (deltas.get(new_key) > deltas.get(old_key)) {
				did_move.add(new_key);
				insert(new_block);
			} else {
				will_move.add(old_key);
				o--;
			}
		}
		while (o--) {
			const old_block = old_blocks[o];
			if (!new_lookup.has(old_block.key)) destroy(old_block, lookup);
		}
		while (n) insert(new_blocks[n - 1]);
		run_all(updates);
		return new_blocks;
	}

	/** @returns {void} */
	function validate_each_keys(ctx, list, get_context, get_key) {
		const keys = new Map();
		for (let i = 0; i < list.length; i++) {
			const key = get_key(get_context(ctx, list, i));
			if (keys.has(key)) {
				let value = '';
				try {
					value = `with value '${String(key)}' `;
				} catch (e) {
					// can't stringify
				}
				throw new Error(
					`Cannot have duplicate keys in a keyed each: Keys at index ${keys.get(
					key
				)} and ${i} ${value}are duplicates`
				);
			}
			keys.set(key, i);
		}
	}

	/** @returns {void} */
	function create_component(block) {
		block && block.c();
	}

	/** @returns {void} */
	function mount_component(component, target, anchor) {
		const { fragment, after_update } = component.$$;
		fragment && fragment.m(target, anchor);
		// onMount happens before the initial afterUpdate
		add_render_callback(() => {
			const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
			// if the component was destroyed immediately
			// it will update the `$$.on_destroy` reference to `null`.
			// the destructured on_destroy may still reference to the old array
			if (component.$$.on_destroy) {
				component.$$.on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});
		after_update.forEach(add_render_callback);
	}

	/** @returns {void} */
	function destroy_component(component, detaching) {
		const $$ = component.$$;
		if ($$.fragment !== null) {
			flush_render_callbacks($$.after_update);
			run_all($$.on_destroy);
			$$.fragment && $$.fragment.d(detaching);
			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			$$.on_destroy = $$.fragment = null;
			$$.ctx = [];
		}
	}

	/** @returns {void} */
	function make_dirty(component, i) {
		if (component.$$.dirty[0] === -1) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty.fill(0);
		}
		component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
	}

	// TODO: Document the other params
	/**
	 * @param {SvelteComponent} component
	 * @param {import('./public.js').ComponentConstructorOptions} options
	 *
	 * @param {import('./utils.js')['not_equal']} not_equal Used to compare props and state values.
	 * @param {(target: Element | ShadowRoot) => void} [append_styles] Function that appends styles to the DOM when the component is first initialised.
	 * This will be the `add_css` function from the compiled component.
	 *
	 * @returns {void}
	 */
	function init(
		component,
		options,
		instance,
		create_fragment,
		not_equal,
		props,
		append_styles = null,
		dirty = [-1]
	) {
		const parent_component = current_component;
		set_current_component(component);
		/** @type {import('./private.js').T$$} */
		const $$ = (component.$$ = {
			fragment: null,
			ctx: [],
			// state
			props,
			update: noop,
			not_equal,
			bound: blank_object(),
			// lifecycle
			on_mount: [],
			on_destroy: [],
			on_disconnect: [],
			before_update: [],
			after_update: [],
			context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
			// everything else
			callbacks: blank_object(),
			dirty,
			skip_bound: false,
			root: options.target || parent_component.$$.root
		});
		append_styles && append_styles($$.root);
		let ready = false;
		$$.ctx = instance
			? instance(component, options.props || {}, (i, ret, ...rest) => {
					const value = rest.length ? rest[0] : ret;
					if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
						if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
						if (ready) make_dirty(component, i);
					}
					return ret;
			  })
			: [];
		$$.update();
		ready = true;
		run_all($$.before_update);
		// `false` as a special case of no DOM component
		$$.fragment = create_fragment ? create_fragment($$.ctx) : false;
		if (options.target) {
			if (options.hydrate) {
				// TODO: what is the correct type here?
				// @ts-expect-error
				const nodes = children(options.target);
				$$.fragment && $$.fragment.l(nodes);
				nodes.forEach(detach);
			} else {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				$$.fragment && $$.fragment.c();
			}
			if (options.intro) transition_in(component.$$.fragment);
			mount_component(component, options.target, options.anchor);
			flush();
		}
		set_current_component(parent_component);
	}

	/**
	 * Base class for Svelte components. Used when dev=false.
	 *
	 * @template {Record<string, any>} [Props=any]
	 * @template {Record<string, any>} [Events=any]
	 */
	class SvelteComponent {
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$ = undefined;
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$set = undefined;

		/** @returns {void} */
		$destroy() {
			destroy_component(this, 1);
			this.$destroy = noop;
		}

		/**
		 * @template {Extract<keyof Events, string>} K
		 * @param {K} type
		 * @param {((e: Events[K]) => void) | null | undefined} callback
		 * @returns {() => void}
		 */
		$on(type, callback) {
			if (!is_function(callback)) {
				return noop;
			}
			const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
			callbacks.push(callback);
			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		/**
		 * @param {Partial<Props>} props
		 * @returns {void}
		 */
		$set(props) {
			if (this.$$set && !is_empty(props)) {
				this.$$.skip_bound = true;
				this.$$set(props);
				this.$$.skip_bound = false;
			}
		}
	}

	/**
	 * @typedef {Object} CustomElementPropDefinition
	 * @property {string} [attribute]
	 * @property {boolean} [reflect]
	 * @property {'String'|'Boolean'|'Number'|'Array'|'Object'} [type]
	 */

	// generated during release, do not modify

	/**
	 * The current version, as set in package.json.
	 *
	 * https://svelte.dev/docs/svelte-compiler#svelte-version
	 * @type {string}
	 */
	const VERSION = '4.2.19';
	const PUBLIC_VERSION = '4';

	/**
	 * @template T
	 * @param {string} type
	 * @param {T} [detail]
	 * @returns {void}
	 */
	function dispatch_dev(type, detail) {
		document.dispatchEvent(custom_event(type, { version: VERSION, ...detail }, { bubbles: true }));
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @returns {void}
	 */
	function append_dev(target, node) {
		dispatch_dev('SvelteDOMInsert', { target, node });
		append(target, node);
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @param {Node} [anchor]
	 * @returns {void}
	 */
	function insert_dev(target, node, anchor) {
		dispatch_dev('SvelteDOMInsert', { target, node, anchor });
		insert(target, node, anchor);
	}

	/**
	 * @param {Node} node
	 * @returns {void}
	 */
	function detach_dev(node) {
		dispatch_dev('SvelteDOMRemove', { node });
		detach(node);
	}

	/**
	 * @param {Node} node
	 * @param {string} event
	 * @param {EventListenerOrEventListenerObject} handler
	 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
	 * @param {boolean} [has_prevent_default]
	 * @param {boolean} [has_stop_propagation]
	 * @param {boolean} [has_stop_immediate_propagation]
	 * @returns {() => void}
	 */
	function listen_dev(
		node,
		event,
		handler,
		options,
		has_prevent_default,
		has_stop_propagation,
		has_stop_immediate_propagation
	) {
		const modifiers =
			options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
		if (has_prevent_default) modifiers.push('preventDefault');
		if (has_stop_propagation) modifiers.push('stopPropagation');
		if (has_stop_immediate_propagation) modifiers.push('stopImmediatePropagation');
		dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
		const dispose = listen(node, event, handler, options);
		return () => {
			dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
			dispose();
		};
	}

	/**
	 * @param {Element} node
	 * @param {string} attribute
	 * @param {string} [value]
	 * @returns {void}
	 */
	function attr_dev(node, attribute, value) {
		attr(node, attribute, value);
		if (value == null) dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
		else dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
	}

	/**
	 * @param {Text} text
	 * @param {unknown} data
	 * @returns {void}
	 */
	function set_data_dev(text, data) {
		data = '' + data;
		if (text.data === data) return;
		dispatch_dev('SvelteDOMSetData', { node: text, data });
		text.data = /** @type {string} */ (data);
	}

	function ensure_array_like_dev(arg) {
		if (
			typeof arg !== 'string' &&
			!(arg && typeof arg === 'object' && 'length' in arg) &&
			!(typeof Symbol === 'function' && arg && Symbol.iterator in arg)
		) {
			throw new Error('{#each} only works with iterable values.');
		}
		return ensure_array_like(arg);
	}

	/**
	 * @returns {void} */
	function validate_slots(name, slot, keys) {
		for (const slot_key of Object.keys(slot)) {
			if (!~keys.indexOf(slot_key)) {
				console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
			}
		}
	}

	/**
	 * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
	 *
	 * Can be used to create strongly typed Svelte components.
	 *
	 * #### Example:
	 *
	 * You have component library on npm called `component-library`, from which
	 * you export a component called `MyComponent`. For Svelte+TypeScript users,
	 * you want to provide typings. Therefore you create a `index.d.ts`:
	 * ```ts
	 * import { SvelteComponent } from "svelte";
	 * export class MyComponent extends SvelteComponent<{foo: string}> {}
	 * ```
	 * Typing this makes it possible for IDEs like VS Code with the Svelte extension
	 * to provide intellisense and to use the component like this in a Svelte file
	 * with TypeScript:
	 * ```svelte
	 * <script lang="ts">
	 * 	import { MyComponent } from "component-library";
	 * </script>
	 * <MyComponent foo={'bar'} />
	 * ```
	 * @template {Record<string, any>} [Props=any]
	 * @template {Record<string, any>} [Events=any]
	 * @template {Record<string, any>} [Slots=any]
	 * @extends {SvelteComponent<Props, Events>}
	 */
	class SvelteComponentDev extends SvelteComponent {
		/**
		 * For type checking capabilities only.
		 * Does not exist at runtime.
		 * ### DO NOT USE!
		 *
		 * @type {Props}
		 */
		$$prop_def;
		/**
		 * For type checking capabilities only.
		 * Does not exist at runtime.
		 * ### DO NOT USE!
		 *
		 * @type {Events}
		 */
		$$events_def;
		/**
		 * For type checking capabilities only.
		 * Does not exist at runtime.
		 * ### DO NOT USE!
		 *
		 * @type {Slots}
		 */
		$$slot_def;

		/** @param {import('./public.js').ComponentConstructorOptions<Props>} options */
		constructor(options) {
			if (!options || (!options.target && !options.$$inline)) {
				throw new Error("'target' is a required option");
			}
			super();
		}

		/** @returns {void} */
		$destroy() {
			super.$destroy();
			this.$destroy = () => {
				console.warn('Component was already destroyed'); // eslint-disable-line no-console
			};
		}

		/** @returns {void} */
		$capture_state() {}

		/** @returns {void} */
		$inject_state() {}
	}

	if (typeof window !== 'undefined')
		// @ts-ignore
		(window.__svelte || (window.__svelte = { v: new Set() })).v.add(PUBLIC_VERSION);

	/* desktop/components/WindowWidget.svelte generated by Svelte v4.2.19 */

	const { console: console_1 } = globals;
	const file$2 = "desktop/components/WindowWidget.svelte";

	function get_each_context$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[23] = list[i];
		child_ctx[25] = i;
		return child_ctx;
	}

	function get_each_context_1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[26] = list[i];
		return child_ctx;
	}

	function get_each_context_2(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[29] = list[i];
		child_ctx[31] = i;
		return child_ctx;
	}

	// (106:2) {#if totalPages > 1}
	function create_if_block(ctx) {
		let div;
		let each_value_2 = ensure_array_like_dev(Array(/*totalPages*/ ctx[2]));
		let each_blocks = [];

		for (let i = 0; i < each_value_2.length; i += 1) {
			each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
		}

		const block = {
			c: function create() {
				div = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr_dev(div, "class", "pagination-dots svelte-1xo0v2l");
				add_location(div, file$2, 106, 2, 2474);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div, null);
					}
				}
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*currentPage, scrollToPage, totalPages*/ 4108) {
					each_value_2 = ensure_array_like_dev(Array(/*totalPages*/ ctx[2]));
					let i;

					for (i = 0; i < each_value_2.length; i += 1) {
						const child_ctx = get_each_context_2(ctx, each_value_2, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block_2(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value_2.length;
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				destroy_each(each_blocks, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block.name,
			type: "if",
			source: "(106:2) {#if totalPages > 1}",
			ctx
		});

		return block;
	}

	// (108:4) {#each Array(totalPages) as _, i}
	function create_each_block_2(ctx) {
		let div;
		let mounted;
		let dispose;

		function click_handler() {
			return /*click_handler*/ ctx[15](/*i*/ ctx[31]);
		}

		const block = {
			c: function create() {
				div = element("div");
				attr_dev(div, "class", "dot svelte-1xo0v2l");
				toggle_class(div, "active", /*currentPage*/ ctx[3] === /*i*/ ctx[31]);
				add_location(div, file$2, 108, 6, 2548);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);

				if (!mounted) {
					dispose = listen_dev(div, "click", click_handler, false, false, false, false);
					mounted = true;
				}
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;

				if (dirty[0] & /*currentPage*/ 8) {
					toggle_class(div, "active", /*currentPage*/ ctx[3] === /*i*/ ctx[31]);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_2.name,
			type: "each",
			source: "(108:4) {#each Array(totalPages) as _, i}",
			ctx
		});

		return block;
	}

	// (130:10) {#each tabs as tab}
	function create_each_block_1(ctx) {
		let div;
		let img;
		let img_src_value;
		let mounted;
		let dispose;

		function click_handler_1() {
			return /*click_handler_1*/ ctx[16](/*tab*/ ctx[26]);
		}

		function mouseenter_handler() {
			return /*mouseenter_handler*/ ctx[17](/*tab*/ ctx[26]);
		}

		const block = {
			c: function create() {
				div = element("div");
				img = element("img");
				attr_dev(img, "class", "favicon svelte-1xo0v2l");
				if (!src_url_equal(img.src, img_src_value = /*tab*/ ctx[26].favIconUrl || 'default-favicon.png')) attr_dev(img, "src", img_src_value);
				attr_dev(img, "alt", "");
				attr_dev(img, "draggable", "false");
				add_location(img, file$2, 136, 14, 3324);
				attr_dev(div, "class", "favicon-wrapper svelte-1xo0v2l");
				add_location(div, file$2, 130, 12, 3097);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				append_dev(div, img);

				if (!mounted) {
					dispose = [
						listen_dev(div, "click", click_handler_1, false, false, false, false),
						listen_dev(div, "mouseenter", mouseenter_handler, false, false, false, false),
						listen_dev(div, "mouseleave", /*mouseleave_handler*/ ctx[18], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;

				if (dirty[0] & /*pages*/ 128 && !src_url_equal(img.src, img_src_value = /*tab*/ ctx[26].favIconUrl || 'default-favicon.png')) {
					attr_dev(img, "src", img_src_value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_1.name,
			type: "each",
			source: "(130:10) {#each tabs as tab}",
			ctx
		});

		return block;
	}

	// (128:6) {#each pages as tabs, pageIndex}
	function create_each_block$1(ctx) {
		let div;
		let t;
		let each_value_1 = ensure_array_like_dev(/*tabs*/ ctx[23]);
		let each_blocks = [];

		for (let i = 0; i < each_value_1.length; i += 1) {
			each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
		}

		const block = {
			c: function create() {
				div = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t = space();
				attr_dev(div, "class", "page svelte-1xo0v2l");
				add_location(div, file$2, 128, 8, 3036);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div, null);
					}
				}

				append_dev(div, t);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*pages, hoverTab*/ 130) {
					each_value_1 = ensure_array_like_dev(/*tabs*/ ctx[23]);
					let i;

					for (i = 0; i < each_value_1.length; i += 1) {
						const child_ctx = get_each_context_1(ctx, each_value_1, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block_1(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div, t);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value_1.length;
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				destroy_each(each_blocks, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block$1.name,
			type: "each",
			source: "(128:6) {#each pages as tabs, pageIndex}",
			ctx
		});

		return block;
	}

	function create_fragment$2(ctx) {
		let div3;
		let t0;
		let div1;
		let div0;
		let t1;
		let div2;
		let t2;
		let mounted;
		let dispose;
		let if_block = /*totalPages*/ ctx[2] > 1 && create_if_block(ctx);
		let each_value = ensure_array_like_dev(/*pages*/ ctx[7]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
		}

		const block = {
			c: function create() {
				div3 = element("div");
				if (if_block) if_block.c();
				t0 = space();
				div1 = element("div");
				div0 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t1 = space();
				div2 = element("div");
				t2 = text(/*title*/ ctx[6]);
				attr_dev(div0, "class", "pages-wrapper svelte-1xo0v2l");
				add_location(div0, file$2, 126, 4, 2961);
				attr_dev(div1, "class", "tabs-container svelte-1xo0v2l");
				toggle_class(div1, "dragging", /*isDragging*/ ctx[5]);
				add_location(div1, file$2, 116, 2, 2695);
				attr_dev(div2, "class", "title svelte-1xo0v2l");
				add_location(div2, file$2, 151, 2, 3598);
				attr_dev(div3, "class", "window-widget svelte-1xo0v2l");
				toggle_class(div3, "closed", !/*window*/ ctx[0].isOpen);
				add_location(div3, file$2, 100, 0, 2370);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div3, anchor);
				if (if_block) if_block.m(div3, null);
				append_dev(div3, t0);
				append_dev(div3, div1);
				append_dev(div1, div0);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div0, null);
					}
				}

				/*div1_binding*/ ctx[19](div1);
				append_dev(div3, t1);
				append_dev(div3, div2);
				append_dev(div2, t2);

				if (!mounted) {
					dispose = [
						listen_dev(div1, "mousedown", /*handleMouseDown*/ ctx[8], false, false, false, false),
						listen_dev(div1, "mousemove", /*handleMouseMove*/ ctx[9], false, false, false, false),
						listen_dev(div1, "mouseup", /*handleMouseUp*/ ctx[10], false, false, false, false),
						listen_dev(div1, "mouseleave", /*handleMouseUp*/ ctx[10], false, false, false, false),
						listen_dev(div1, "scroll", /*handleScroll*/ ctx[11], false, false, false, false),
						listen_dev(div2, "mousedown", /*restoreWindow*/ ctx[13], false, false, false, false),
						listen_dev(div3, "dblclick", /*dblclick_handler*/ ctx[14], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (/*totalPages*/ ctx[2] > 1) {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block(ctx);
						if_block.c();
						if_block.m(div3, t0);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				if (dirty[0] & /*pages, hoverTab*/ 130) {
					each_value = ensure_array_like_dev(/*pages*/ ctx[7]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$1(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block$1(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div0, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value.length;
				}

				if (dirty[0] & /*isDragging*/ 32) {
					toggle_class(div1, "dragging", /*isDragging*/ ctx[5]);
				}

				if (dirty[0] & /*title*/ 64) set_data_dev(t2, /*title*/ ctx[6]);

				if (dirty[0] & /*window*/ 1) {
					toggle_class(div3, "closed", !/*window*/ ctx[0].isOpen);
				}
			},
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div3);
				}

				if (if_block) if_block.d();
				destroy_each(each_blocks, detaching);
				/*div1_binding*/ ctx[19](null);
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$2.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	async function handleTabClick(tab) {
		await chrome.tabs.create({ url: tab.url });
	}

	function instance$2($$self, $$props, $$invalidate) {
		let totalPages;
		let pages;
		let title;
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('WindowWidget', slots, []);
		let dispatch = createEventDispatcher();
		let { window } = $$props;
		let currentPage = 0;
		let hoverTab = null;
		let tabsContainer;
		let isDragging = false;
		let startX;
		let scrollLeft;

		function handleMouseDown(e) {
			$$invalidate(5, isDragging = true);
			startX = e.pageX - tabsContainer.offsetLeft;
			scrollLeft = tabsContainer.scrollLeft;
		}

		function handleMouseMove(e) {
			if (!isDragging) return;
			const x = e.pageX - tabsContainer.offsetLeft;
			const walk = (x - startX) * 2;
			$$invalidate(4, tabsContainer.scrollLeft = scrollLeft - walk, tabsContainer);
		}

		function handleMouseUp() {
			$$invalidate(5, isDragging = false);
		}

		function handleScroll() {
			const pageWidth = tabsContainer.clientWidth;
			$$invalidate(3, currentPage = Math.round(tabsContainer.scrollLeft / pageWidth));
		}

		function scrollToPage(pageIndex) {
			const pageWidth = tabsContainer.clientWidth;

			tabsContainer.scrollTo({
				left: pageWidth * pageIndex,
				behavior: 'smooth'
			});

			$$invalidate(3, currentPage = pageIndex);
		}

		// Handle window restoration
		async function restoreWindow() {
			try {
				// Create new window with all tabs
				const newWindow = await chrome.windows.create({ url: window.tabs.map(tab => tab.url) });

				if (window.name) {
					
				} else // const groupId = await chrome.tabs.group({
				//   tabIds: newWindow.tabs.map(tab => tab.id)
				// });
				// await chrome.tabGroups.update(groupId, {
				//   title: window.name,
				//   color: window.color
				// });
				// // Update window state
				// const updatedWindow = {
				//   ...window,
				//   isOpen: true,
				//   groupId
				// };
				{
					// Remove temporary window after restoration
					dispatch(
						'removeWindow',
						window.id
					);
				}
			} catch(error) {
				console.error('Failed to restore window:', error);
			}
		}

		$$self.$$.on_mount.push(function () {
			if (window === undefined && !('window' in $$props || $$self.$$.bound[$$self.$$.props['window']])) {
				console_1.warn("<WindowWidget> was created without expected prop 'window'");
			}
		});

		const writable_props = ['window'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<WindowWidget> was created with unknown prop '${key}'`);
		});

		function dblclick_handler(event) {
			bubble.call(this, $$self, event);
		}

		const click_handler = i => scrollToPage(i);
		const click_handler_1 = tab => handleTabClick(tab);
		const mouseenter_handler = tab => $$invalidate(1, hoverTab = tab);
		const mouseleave_handler = () => $$invalidate(1, hoverTab = null);

		function div1_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				tabsContainer = $$value;
				$$invalidate(4, tabsContainer);
			});
		}

		$$self.$$set = $$props => {
			if ('window' in $$props) $$invalidate(0, window = $$props.window);
		};

		$$self.$capture_state = () => ({
			createEventDispatcher,
			dispatch,
			window,
			currentPage,
			hoverTab,
			tabsContainer,
			isDragging,
			startX,
			scrollLeft,
			handleMouseDown,
			handleMouseMove,
			handleMouseUp,
			handleScroll,
			scrollToPage,
			handleTabClick,
			restoreWindow,
			title,
			totalPages,
			pages
		});

		$$self.$inject_state = $$props => {
			if ('dispatch' in $$props) dispatch = $$props.dispatch;
			if ('window' in $$props) $$invalidate(0, window = $$props.window);
			if ('currentPage' in $$props) $$invalidate(3, currentPage = $$props.currentPage);
			if ('hoverTab' in $$props) $$invalidate(1, hoverTab = $$props.hoverTab);
			if ('tabsContainer' in $$props) $$invalidate(4, tabsContainer = $$props.tabsContainer);
			if ('isDragging' in $$props) $$invalidate(5, isDragging = $$props.isDragging);
			if ('startX' in $$props) startX = $$props.startX;
			if ('scrollLeft' in $$props) scrollLeft = $$props.scrollLeft;
			if ('title' in $$props) $$invalidate(6, title = $$props.title);
			if ('totalPages' in $$props) $$invalidate(2, totalPages = $$props.totalPages);
			if ('pages' in $$props) $$invalidate(7, pages = $$props.pages);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty[0] & /*window*/ 1) {
				$$invalidate(2, totalPages = Math.ceil(window.tabs.length / 9));
			}

			if ($$self.$$.dirty[0] & /*totalPages, window*/ 5) {
				$$invalidate(7, pages = Array.from({ length: totalPages }, (_, i) => window.tabs.slice(i * 9, (i + 1) * 9)));
			}

			if ($$self.$$.dirty[0] & /*hoverTab, window*/ 3) {
				$$invalidate(6, title = hoverTab
				? hoverTab.title
				: window.name || window.tabs[0].title);
			}
		};

		return [
			window,
			hoverTab,
			totalPages,
			currentPage,
			tabsContainer,
			isDragging,
			title,
			pages,
			handleMouseDown,
			handleMouseMove,
			handleMouseUp,
			handleScroll,
			scrollToPage,
			restoreWindow,
			dblclick_handler,
			click_handler,
			click_handler_1,
			mouseenter_handler,
			mouseleave_handler,
			div1_binding
		];
	}

	class WindowWidget extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$2, create_fragment$2, safe_not_equal, { window: 0 }, null, [-1, -1]);

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "WindowWidget",
				options,
				id: create_fragment$2.name
			});
		}

		get window() {
			throw new Error("<WindowWidget>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set window(value) {
			throw new Error("<WindowWidget>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* desktop/components/WindowGrid.svelte generated by Svelte v4.2.19 */
	const file$1 = "desktop/components/WindowGrid.svelte";

	function get_each_context(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[2] = list[i];
		return child_ctx;
	}

	// (25:2) {#each windows as window (window.id)}
	function create_each_block(key_1, ctx) {
		let div;
		let windowwidget;
		let t;
		let current;

		windowwidget = new WindowWidget({
				props: { window: /*window*/ ctx[2] },
				$$inline: true
			});

		windowwidget.$on("removeWindow", /*removeWindow_handler*/ ctx[1]);

		const block = {
			key: key_1,
			first: null,
			c: function create() {
				div = element("div");
				create_component(windowwidget.$$.fragment);
				t = space();
				attr_dev(div, "class", "window-wrapper svelte-1hx1igd");
				add_location(div, file$1, 25, 4, 443);
				this.first = div;
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				mount_component(windowwidget, div, null);
				append_dev(div, t);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				const windowwidget_changes = {};
				if (dirty & /*windows*/ 1) windowwidget_changes.window = /*window*/ ctx[2];
				windowwidget.$set(windowwidget_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(windowwidget.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(windowwidget.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				destroy_component(windowwidget);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block.name,
			type: "each",
			source: "(25:2) {#each windows as window (window.id)}",
			ctx
		});

		return block;
	}

	function create_fragment$1(ctx) {
		let div;
		let each_blocks = [];
		let each_1_lookup = new Map();
		let current;
		let each_value = ensure_array_like_dev(/*windows*/ ctx[0]);
		const get_key = ctx => /*window*/ ctx[2].id;
		validate_each_keys(ctx, each_value, get_each_context, get_key);

		for (let i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
		}

		const block = {
			c: function create() {
				div = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr_dev(div, "class", "grid svelte-1hx1igd");
				add_location(div, file$1, 23, 0, 380);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div, null);
					}
				}

				current = true;
			},
			p: function update(ctx, [dirty]) {
				if (dirty & /*windows*/ 1) {
					each_value = ensure_array_like_dev(/*windows*/ ctx[0]);
					group_outros();
					validate_each_keys(ctx, each_value, get_each_context, get_key);
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, outro_and_destroy_block, create_each_block, null, get_each_context);
					check_outros();
				}
			},
			i: function intro(local) {
				if (current) return;

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				current = true;
			},
			o: function outro(local) {
				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$1.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$1($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('WindowGrid', slots, []);
		let { windows = [] } = $$props;
		const writable_props = ['windows'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<WindowGrid> was created with unknown prop '${key}'`);
		});

		function removeWindow_handler(event) {
			bubble.call(this, $$self, event);
		}

		$$self.$$set = $$props => {
			if ('windows' in $$props) $$invalidate(0, windows = $$props.windows);
		};

		$$self.$capture_state = () => ({
			createEventDispatcher,
			WindowWidget,
			windows
		});

		$$self.$inject_state = $$props => {
			if ('windows' in $$props) $$invalidate(0, windows = $$props.windows);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [windows, removeWindow_handler];
	}

	class WindowGrid extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$1, create_fragment$1, safe_not_equal, { windows: 0 });

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "WindowGrid",
				options,
				id: create_fragment$1.name
			});
		}

		get windows() {
			throw new Error("<WindowGrid>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set windows(value) {
			throw new Error("<WindowGrid>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* desktop/App.svelte generated by Svelte v4.2.19 */
	const file = "desktop/App.svelte";

	function create_fragment(ctx) {
		let div;
		let windowgrid;
		let current;

		windowgrid = new WindowGrid({
				props: { windows: /*windows*/ ctx[0] },
				$$inline: true
			});

		windowgrid.$on("windowUse", /*windowUse_handler*/ ctx[3]);
		windowgrid.$on("removeWindow", /*removeWindow*/ ctx[2]);

		const block = {
			c: function create() {
				div = element("div");
				create_component(windowgrid.$$.fragment);
				attr_dev(div, "class", "desktop svelte-14n1d1h");
				add_location(div, file, 64, 0, 1424);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				mount_component(windowgrid, div, null);
				current = true;
			},
			p: function update(ctx, [dirty]) {
				const windowgrid_changes = {};
				if (dirty & /*windows*/ 1) windowgrid_changes.windows = /*windows*/ ctx[0];
				windowgrid.$set(windowgrid_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(windowgrid.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(windowgrid.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				destroy_component(windowgrid);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('App', slots, []);
		let windows = [];
		let temporaryWindows = [];
		let savedWindows = [];

		onMount(async () => {
			$$invalidate(0, windows = (await chrome.storage.local.get(['windows']))?.windows ?? []);

			chrome.storage.onChanged.addListener((changes, namespace) => {
				if (namespace === 'local') {
					if (changes.windows) {
						$$invalidate(0, windows = changes.windows.newValue);
					}

					if (changes.workspace) {
						savedWindows = changes.workspace.newValue;
					}
				}
			});
		});

		function handleWindowUse(windowId) {
			// Update last used timestamp and resort windows
			$$invalidate(0, windows = windows.map(w => w.id === windowId ? { ...w, lastUsed: Date.now() } : w).sort((a, b) => b.lastUsed - a.lastUsed));

			// Save updated order
			chrome.storage.local.set({ windows });
		}

		function removeWindow({ detail }) {
			const { windowId } = detail;
			$$invalidate(0, windows = windows.filter(w => w.id !== windowId));
			chrome.storage.local.set({ windows });
		}

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
		});

		const windowUse_handler = ({ detail }) => handleWindowUse(detail);

		$$self.$capture_state = () => ({
			onMount,
			WindowGrid,
			windows,
			temporaryWindows,
			savedWindows,
			handleWindowUse,
			removeWindow
		});

		$$self.$inject_state = $$props => {
			if ('windows' in $$props) $$invalidate(0, windows = $$props.windows);
			if ('temporaryWindows' in $$props) temporaryWindows = $$props.temporaryWindows;
			if ('savedWindows' in $$props) savedWindows = $$props.savedWindows;
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [windows, handleWindowUse, removeWindow, windowUse_handler];
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance, create_fragment, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "App",
				options,
				id: create_fragment.name
			});
		}
	}

	const app = new App({
	  target: document.body
	});

	return app;

})();
//# sourceMappingURL=bundle.js.map
