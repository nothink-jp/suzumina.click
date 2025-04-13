"use client"; // Headless UI コンポーネントはクライアントコンポーネント内で使用

import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { ChevronUpIcon } from "@heroicons/react/24/solid";

export default function HeadlessUiDisclosureExample() {
  return (
    <div className="w-full max-w-md rounded-lg bg-base-200 p-2 mt-8">
      <Disclosure>
        {({ open }) => (
          /* React.Fragment を div に変更 */
          <div>
            <DisclosureButton className="flex w-full justify-between rounded-lg bg-base-100 px-4 py-2 text-left text-sm font-medium focus:outline-none focus-visible:ring focus-visible:ring-primary focus-visible:ring-opacity-75">
              <span>Headless UI Disclosure サンプル</span>
              <ChevronUpIcon
                className={`${
                  open ? "rotate-180 transform" : ""
                } h-5 w-5 text-primary transition`} // アイコンの回転アニメーション
              />
            </DisclosureButton>
            <DisclosurePanel className="px-4 pt-4 pb-2 text-sm text-base-content/80">
              これは Headless UI の Disclosure コンポーネントのサンプルです。
              スタイルは DaisyUI/Tailwind CSS のクラスを使用して適用しています。
              開閉状態 (`open`) に応じてアイコンの向きが変わります。
            </DisclosurePanel>
          </div>
        )}
      </Disclosure>
    </div>
  );
}
