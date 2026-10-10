const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

const jsx = (type, props) => ({ type, props });
const theme = {
  colors: {
    surface: "#fff",
    outline: "#ccc",
    primary: "#36f",
    background: "#fff",
    onSurfaceVariant: "#666",
    primaryContainer: "#eef",
    surfaceVariant: "#eee",
    error: "#c00",
    onSurface: "#111",
  },
};
function dialogHost(name) {
  const component = function DialogHost(props) { return props.children; };
  component.displayName = name;
  return component;
}
const Dialog = dialogHost("Dialog");
Dialog.Title = "DialogTitle";
Dialog.Content = "DialogContent";
Dialog.Actions = "DialogActions";
const fade = { delay: () => fade, springify: () => ({}) };

function queryResult(overrides = {}) {
  return {
    data: undefined,
    error: null,
    isPending: false,
    isError: false,
    isSuccess: false,
    isRefetching: false,
    refetch: async () => ({ isSuccess: true }),
    ...overrides,
  };
}

function exercise(id, dueAt) {
  return {
    id,
    classId: "class-1",
    title: "Bài kiểm tra",
    description: "Mô tả",
    dueAt,
    createdBy: "teacher-1",
  };
}

function harness(kind) {
  const ctx = {
    role: "student",
    params: { id: "class-1", exerciseId: "ex-1", title: "Bài kiểm tra", name: "Lớp 1" },
    exercises: queryResult({ isSuccess: true, data: [] }),
    mine: queryResult({ isSuccess: true, data: null }),
    submissions: queryResult({ isSuccess: true, data: [] }),
  };
  const local = {
    Screen: { Screen: "Screen" },
    Skeleton: { ClassListSkeleton: "ClassListSkeleton" },
    EmptyState: { EmptyState: "EmptyState", ErrorState: "ErrorState" },
    AppButton: { AppButton: "AppButton" },
    "auth-context": { useAuth: () => ({ token: "test-session", user: { id: "user-1", role: ctx.role, displayName: "Người dùng" } }) },
    "user-error-message": { userErrorMessage: (error) => error.message },
    "exercises-api": {
      createExercise: async () => ({}),
      defaultDueAtIso: () => "2099-01-01T00:00:00.000Z",
      isExerciseOpen: (dueAt) => String(dueAt).startsWith("2099"),
      listExercises: async () => [],
      createSubmission: async () => ({}),
      getMySubmission: async () => null,
      listSubmissions: async () => [],
      putGrade: async () => ({}),
      updateMySubmission: async () => ({}),
      validateGradeScore: (value) => Number(value),
    },
    "query-client": {
      queryClient: { invalidateQueries: async () => {} },
      queryKeys: {
        exercises: () => ["exercises"],
        mySubmission: () => ["exercises", "mine"],
        exerciseSubmissions: () => ["exercises", "submissions"],
      },
    },
    haptics: { impactLight() {}, notifyError() {}, notifySuccess() {} },
    FormFeedback: {
      FieldError: "FieldError",
      FormNotice: "FormNotice",
      FormDialogScroll: "FormDialogScroll",
      keyboardBehavior: "padding",
      useKeyboardLift: () => 0,
    },
    tokens: {
      elevation: { card: {} },
      palette: { success: "#0a0", danger: "#c00" },
      radius: { lg: 12, md: 8, pill: 99, sm: 4 },
      spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 },
      typography: { title: {}, subtitle: {}, body: {}, caption: {}, display: {} },
    },
  };
  const mocks = {
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    react: {
      useEffect: (effect) => { effect(); },
      useState: (value) => [typeof value === "function" ? value() : value, () => {}],
    },
    "@tanstack/react-query": {
      useQuery: (options) => {
        const key = options.queryKey ?? [];
        if (key.includes("mine")) return ctx.mine;
        if (key.includes("submissions")) return ctx.submissions;
        return ctx.exercises;
      },
      useMutation: () => ({ isPending: false, mutate() {}, reset() {} }),
    },
    "expo-router": {
      useLocalSearchParams: () => ctx.params,
      useNavigation: () => ({ setOptions() {} }),
      useRouter: () => ({ push() {} }),
    },
    "react-native": {
      Keyboard: { addListener: () => ({ remove() {} }) },
      KeyboardAvoidingView: "KeyboardAvoidingView",
      Platform: { OS: "android" },
      Pressable: "Pressable",
      RefreshControl: "RefreshControl",
      ScrollView: "ScrollView",
      StyleSheet: { create: (value) => value, hairlineWidth: 1 },
      View: "View",
    },
    "react-native-paper": {
      Dialog,
      FAB: "FAB",
      HelperText: "HelperText",
      Portal: "Portal",
      Text: "Text",
      TextInput: "TextInput",
      useTheme: () => theme,
    },
    "react-native-reanimated": { default: { View: "AnimatedView" }, FadeInDown: fade },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) },
    "@expo/vector-icons": { Ionicons: "Ionicons" },
  };
  const filename = resolve(__dirname, kind === "list"
    ? "../app/class/[id]/exercises.tsx"
    : "../app/class/[id]/exercise/[exerciseId].tsx");
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function("require", "exports", compiled)((name) => {
    const result = mocks[name] || local[name.split("/").pop().replace(/\.tsx$/, "")];
    assert.ok(result, "Unexpected dependency: " + name);
    return result;
  }, exports);
  return {
    ctx,
    render() {
      return exports.default();
    },
  };
}

function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (typeof node === "function") return [];
  if (!node || typeof node !== "object") return [];
  if (typeof node.type === "function") return nodes(node.type(node.props));
  return [node, ...nodes(node.props?.children)];
}

function textOf(node) {
  const children = node?.props?.children;
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) {
    return children.map((child) => (child && typeof child === "object" ? textOf(child) : String(child ?? ""))).join("");
  }
  return "";
}

function treeText(tree) {
  return tree.map(textOf).join("\n");
}

const skeletonSource = readFileSync(resolve(__dirname, "../src/components/ui/Skeleton.tsx"), "utf8");
const exerciseListSource = readFileSync(resolve(__dirname, "../app/class/[id]/exercises.tsx"), "utf8");
const exerciseDetailSource = readFileSync(resolve(__dirname, "../app/class/[id]/exercise/[exerciseId].tsx"), "utf8");

function assertVisibleLoadingLabel(label) {
  const screenSource = label === "Đang tải danh sách bài tập" ? exerciseListSource : exerciseDetailSource;
  assert.match(screenSource, new RegExp(`<ClassListSkeleton accessibilityLabel="${label}"`));
  assert.match(skeletonSource, /<Text\b[^>]*>\s*\{accessibilityLabel\}\s*<\/Text>/);
  assert.match(skeletonSource, /accessibilityLabel=\{accessibilityLabel\}/);
  assert.doesNotMatch(
    skeletonSource,
    /accessibilityLabel=\{accessibilityLabel\}[\s\S]*accessibilityLabel=\{accessibilityLabel\}/,
  );
}

test("exercise list shows loading, empty, and error with retry", () => {
  const h = harness("list");
  h.ctx.exercises = queryResult({ isPending: true });
  let tree = nodes(h.render());
  assert.equal(tree.filter((node) => node.type === "ClassListSkeleton").length, 1);
  assert.equal(tree.find((node) => node.type === "ClassListSkeleton").props.accessibilityLabel, "Đang tải danh sách bài tập");
  assertVisibleLoadingLabel("Đang tải danh sách bài tập");
  assert.equal(tree.some((node) => node.type === "EmptyState" || node.type === "ErrorState"), false);

  let refetched = 0;
  h.ctx.exercises = queryResult({
    isError: true,
    error: new Error("Mất kết nối danh sách"),
    refetch: async () => { refetched += 1; return { isSuccess: true }; },
  });
  tree = nodes(h.render());
  const error = tree.find((node) => node.type === "ErrorState");
  assert.equal(error.props.message, "Mất kết nối danh sách");
  error.props.onRetry();
  assert.equal(refetched, 1);
  assert.equal(tree.some((node) => node.type === "EmptyState"), false);

  h.ctx.role = "student";
  h.ctx.exercises = queryResult({ isSuccess: true, data: [] });
  tree = nodes(h.render());
  const studentEmpty = tree.find((node) => node.type === "EmptyState");
  assert.equal(studentEmpty.props.title, "Chưa có bài tập");
  assert.match(studentEmpty.props.subtitle, /chưa giao bài tập/);
  assert.equal(studentEmpty.props.actionLabel, undefined);

  h.ctx.role = "teacher";
  tree = nodes(h.render());
  const teacherEmpty = tree.find((node) => node.type === "EmptyState");
  assert.equal(teacherEmpty.props.title, "Chưa có bài tập");
  assert.equal(teacherEmpty.props.actionLabel, "Tạo bài tập");
  assert.equal(typeof teacherEmpty.props.onAction, "function");
  assert.equal(tree.some((node) => node.type === "FAB"), false);
  assert.equal(tree.some((node) => node.type === "ClassListSkeleton" || node.type === "ErrorState"), false);
});

test("exercise list renders rows after a successful non-empty query", () => {
  const h = harness("list");
  h.ctx.exercises = queryResult({
    isSuccess: true,
    data: [exercise("ex-1", "2099-06-01T00:00:00.000Z")],
  });
  const tree = nodes(h.render());
  assert.equal(tree.some((node) => node.type === "EmptyState" || node.type === "ErrorState" || node.type === "ClassListSkeleton"), false);
  assert.match(treeText(tree), /Bài kiểm tra/);
  assert.match(treeText(tree), /1 bài tập/);
  assert.equal(tree.some((node) => node.type === "FAB"), false);

  h.ctx.role = "teacher";
  const teacherTree = nodes(h.render());
  assert.equal(teacherTree.filter((node) => node.type === "FAB").length, 1);
  assert.equal(teacherTree.some((node) => node.type === "EmptyState" || node.type === "ErrorState"), false);
});

test("exercise errors stay beside fields and the fab does not cover them", () => {
  const h = harness("list");
  h.ctx.role = "teacher";
  h.ctx.exercises = queryResult({ isError: true, error: new Error("Mất kết nối danh sách") });
  const tree = nodes(h.render());
  assert.equal(tree.some((node) => node.type === "ErrorState"), true);
  assert.equal(tree.some((node) => node.type === "FAB" || node.type === "EmptyState" || node.type === "ClassListSkeleton"), false);
  assert.match(exerciseListSource, /FieldError message=\{titleError\}/);
  assert.match(exerciseListSource, /FormNotice message=\{formError\}/);
  assert.match(exerciseListSource, /FormDialogScroll/);
  assert.match(exerciseListSource, /paddingBottom: 128 \+ insets\.bottom/);
  assert.match(exerciseListSource, /query\.isSuccess && exercises\.length > 0/);
  assert.match(exerciseDetailSource, /FieldError message=\{submitError\}/);
  assert.match(exerciseDetailSource, /FieldError message=\{gradeError\}/);
  assert.match(exerciseDetailSource, /error=\{Boolean\(gradeError\)\}/);
});

test("exercise detail keeps loading, missing, and error exclusive", () => {
  const h = harness("detail");
  h.ctx.exercises = queryResult({ isPending: true });
  let tree = nodes(h.render());
  assert.equal(tree.find((node) => node.type === "ClassListSkeleton").props.accessibilityLabel, "Đang tải bài tập");
  assertVisibleLoadingLabel("Đang tải bài tập");
  assert.equal(tree.some((node) => node.type === "EmptyState"), false);

  let refetched = 0;
  h.ctx.exercises = queryResult({
    isError: true,
    error: new Error("Không tải được bài tập"),
    refetch: async () => { refetched += 1; return { isSuccess: true }; },
  });
  tree = nodes(h.render());
  tree.find((node) => node.type === "ErrorState").props.onRetry();
  assert.equal(refetched, 1);

  h.ctx.exercises = queryResult({ isSuccess: true, data: [], refetch: async () => { refetched += 1; return { isSuccess: true }; } });
  tree = nodes(h.render());
  const missing = tree.find((node) => node.type === "EmptyState");
  assert.equal(missing.props.title, "Không tìm thấy bài tập");
  missing.props.onAction();
  assert.equal(refetched, 2);
  assert.equal(tree.some((node) => node.type === "ErrorState"), false);
});

test("student submission states stay exclusive and keep the waiting sentence", () => {
  const h = harness("detail");
  const closed = exercise("ex-1", "2020-01-01T00:00:00.000Z");
  h.ctx.exercises = queryResult({ isSuccess: true, data: [closed] });
  h.ctx.mine = queryResult({ isPending: true });
  let tree = nodes(h.render());
  assert.equal(tree.find((node) => node.type === "ClassListSkeleton").props.accessibilityLabel, "Đang tải bài làm");
  assertVisibleLoadingLabel("Đang tải bài làm");
  assert.equal(tree.some((node) => node.type === "EmptyState"), false);
  assert.doesNotMatch(treeText(tree), /chờ giáo viên chấm điểm/);

  let refetched = 0;
  h.ctx.mine = queryResult({
    isError: true,
    error: new Error("Không tải được bài làm"),
    refetch: async () => { refetched += 1; return { isSuccess: true }; },
  });
  tree = nodes(h.render());
  tree.find((node) => node.type === "ErrorState").props.onRetry();
  assert.equal(refetched, 1);
  assert.equal(tree.some((node) => node.type === "EmptyState"), false);

  h.ctx.mine = queryResult({ isSuccess: true, data: null });
  tree = nodes(h.render());
  assert.equal(tree.find((node) => node.type === "EmptyState").props.title, "Bạn chưa nộp bài");
  assert.doesNotMatch(treeText(tree), /chờ giáo viên chấm điểm/);

  h.ctx.mine = queryResult({
    isSuccess: true,
    data: { submission: { id: "sub-1", content: "Đã làm", url: "" }, grade: null },
  });
  tree = nodes(h.render());
  assert.match(treeText(tree), /Đã nộp · chờ giáo viên chấm điểm/);
  assert.equal(tree.some((node) => node.type === "EmptyState"), false);

  h.ctx.exercises = queryResult({ isSuccess: true, data: [exercise("ex-1", "2099-06-01T00:00:00.000Z")] });
  tree = nodes(h.render());
  assert.equal(tree.some((node) => node.props?.children === "Nộp bài" || textOf(node) === "Nộp bài"), false);
  assert.match(treeText(tree), /Cập nhật bài nộp/);
  assert.doesNotMatch(treeText(tree), /chờ giáo viên chấm điểm/);

  h.ctx.exercises = queryResult({ isSuccess: true, data: [closed] });
  h.ctx.mine = queryResult({
    isSuccess: true,
    data: { submission: { id: "sub-1", content: "Đã làm", url: "" }, grade: { score: 8.5, feedback: "Làm tốt" } },
  });
  tree = nodes(h.render());
  assert.match(treeText(tree), /Điểm · 8\.5\/10/);
  assert.match(treeText(tree), /Làm tốt/);
  assert.doesNotMatch(treeText(tree), /chờ giáo viên chấm điểm/);
});

test("teacher submission list shows loading, empty, error, and trimmed feedback", () => {
  const h = harness("detail");
  h.ctx.role = "teacher";
  h.ctx.exercises = queryResult({ isSuccess: true, data: [exercise("ex-1", "2020-01-01T00:00:00.000Z")] });
  h.ctx.submissions = queryResult({ isPending: true });
  let tree = nodes(h.render());
  assert.equal(tree.find((node) => node.type === "ClassListSkeleton").props.accessibilityLabel, "Đang tải bài nộp");
  assertVisibleLoadingLabel("Đang tải bài nộp");
  assert.equal(tree.some((node) => node.type === "EmptyState"), false);

  let refetched = 0;
  h.ctx.submissions = queryResult({
    isError: true,
    error: new Error("Không tải được bài nộp"),
    refetch: async () => { refetched += 1; return { isSuccess: true }; },
  });
  tree = nodes(h.render());
  tree.find((node) => node.type === "ErrorState").props.onRetry();
  assert.equal(refetched, 1);
  assert.equal(tree.some((node) => node.type === "EmptyState"), false);

  h.ctx.submissions = queryResult({ isSuccess: true, data: [] });
  tree = nodes(h.render());
  assert.equal(tree.find((node) => node.type === "EmptyState").props.title, "Chưa có bài nộp");

  h.ctx.submissions = queryResult({
    isSuccess: true,
    data: [{
      id: "sub-1",
      studentId: "student-1",
      content: "Bài làm",
      url: "",
      grade: { score: 8.5, feedback: "  Nhận xét đã chấm  " },
    }],
  });
  tree = nodes(h.render());
  assert.match(treeText(tree), /Đã chấm · 8\.5\/10/);
  assert.match(treeText(tree), /Nhận xét đã chấm/);
  assert.doesNotMatch(treeText(tree), /  Nhận xét đã chấm  /);

  h.ctx.submissions = queryResult({
    isSuccess: true,
    data: [{
      id: "sub-2",
      studentId: "student-2",
      content: "Bài làm",
      url: "",
      grade: { score: 8.5, feedback: "   " },
    }],
  });
  tree = nodes(h.render());
  assert.match(treeText(tree), /Đã chấm · 8\.5\/10/);
  assert.doesNotMatch(treeText(tree), /Nhận xét/);
});
